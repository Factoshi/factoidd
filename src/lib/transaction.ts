import { Transaction, TransactionAddress } from 'factom';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';

import { TransactionRow } from './types';
import { AddressConfig } from './types';
import { toInteger, to8DecimalPlaces } from './utils';
import { TransactionTable } from './db';
import { logger } from './logger';
import { Factom } from './factom';

axiosRetry(axios, { retryDelay: exponentialDelay });

function formatIncomeTransaction(
    tx: Transaction,
    conf: AddressConfig,
    receivedFCT: number,
    currency: string
): TransactionRow {
    return {
        address: conf.address,
        name: conf.name,
        timestamp: toInteger(tx.timestamp / 1000),
        date: new Date(tx.timestamp).toISOString(),
        txhash: tx.id,
        height: tx.blockContext.directoryBlockHeight,
        symbol: 'FCT',
        currency,
        receivedFCT,
    };
}

/**
 * Sums transaction inputs or outputs from an array of TransactionAddress for given address
 * @param txIO Array of TransactionAddress
 * @param address Address to sum IO for
 */
export function sumFCTIO(txIO: TransactionAddress[], address: string) {
    // prettier-ignore
    return txIO
        .filter((io) => io.address === address)
        .reduce((total, current) => (total += current.amount), 0) * Math.pow(10, -8);
}

/**
 * Loops over past heights to fill in historical transaction data.
 */
export async function emitNewTransactions(
    db: TransactionTable,
    configStartHeight: number,
    factom: Factom
) {
    try {
        // Find the maximum processed height.
        const m = await db.getMaxHeight();
        // If the config start height is ahead of the DB, we'll use that instead.
        const startHeight = m > configStartHeight ? m + 1 : configStartHeight;
        // Find the height at the tip of the blockchain.
        const { directoryBlockHeight: stopHeight } = await factom.cli.getHeights();

        // Loop over missing heights.
        logger.info(`Fetching new tranactions between ${startHeight} and ${stopHeight}`);
        for (let i = startHeight; i <= stopHeight; i++) {
            if (i % 1000 === 0) logger.info(`Scanning block height: ${i}`);

            const directoryBlock = await factom.cli.getDirectoryBlock(i);
            // Each directory block is fed into the event emitter. That will emit factoid transactions
            // for the addresses held in the config to be processed in the same manner as new found transactions.
            factom.event.handleDirectoryBlock(directoryBlock);
        }
        logger.info(`Scan complete`);
    } catch (e) {
        logger.error('Fatal error. Unable to backfill transactions: ', e);
        process.exit(1);
    }
}

function logNewTransaction(tx: TransactionRow) {
    logger.info(`\x1b[33mFound new transaction to ${tx.name}\x1b[0m`);
    logger.info(`Transaction ID:    ${tx.txhash}`);
    logger.info(`Date:              ${tx.date}`);
    logger.info(`Height:            ${tx.height}`);
    logger.info(`Address:           ${tx.address}`);
    logger.info(`Amount:            ${to8DecimalPlaces(tx.receivedFCT)}`);
}

/**
 * Saves all relevant transactions.
 * @param {AddressConfig} conf Config for a specific address.
 */
export async function saveNewTransaction(
    conf: AddressConfig,
    db: TransactionTable,
    tx: Transaction,
    currency: string
) {
    const { address, coinbase, nonCoinbase } = conf;
    // Address may only record coinbase or non-coinbsae tranactions.
    const isCoinbase = tx.totalInputs === 0;
    if ((isCoinbase && !coinbase) || (!isCoinbase && !nonCoinbase)) {
        return;
    }

    const received = sumFCTIO(tx.factoidOutputs, address);
    // Function only handles income transactions. If address did not received FCT then
    // it was not an income transaction.
    if (received === 0) {
        return;
    }

    const txRow = formatIncomeTransaction(tx, conf, received, currency);
    logNewTransaction(txRow);

    // Save it to the database. This is a critical step and the programme will exit if it fails.
    try {
        await db.insertUncommittedTransaction(txRow);
    } catch (e) {
        logger.error(`Fatal error. Failed to save transaction to database: `, e);
        process.exit(1);
    }
}
