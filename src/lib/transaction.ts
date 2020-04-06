import { Transaction, TransactionAddress } from 'factom';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';

import { TransactionRow } from './types';
import { AddressConfig } from './types';
import { toInteger } from './utils';
import { TransactionTable } from './db';
import { logger } from './logger';
import { Factom } from './factom';

axiosRetry(axios, { retries: 2, retryDelay: exponentialDelay });

function sumFCTIO(inputsOutputs: TransactionAddress[], address: string) {
    // prettier-ignore
    return inputsOutputs
        .filter((output) => output.address === address)
        .reduce((total, current) => (total += current.amount), 0) * Math.pow(10, -8);
}

/**
 * Formats transaction and saves it to the DB.
 * @param tx The transaction to be saved.
 * @param conf The config for the address to which the transaction pertains.
 * @param txTable The database object to save the transaction.
 */
function saveNewTransaction(tx: Transaction, conf: AddressConfig, txTable: TransactionTable) {
    const txRow: TransactionRow = {
        address: conf.address,
        timestamp: toInteger(tx.timestamp / 1000),
        date: new Date(tx.timestamp).toISOString(),
        txhash: tx.id,
        height: tx.blockContext.directoryBlockHeight,
        symbol: 'FCT',
        currency: conf.currency,
        receivedFCT: sumFCTIO(tx.factoidOutputs, conf.address),
        sentFCT: sumFCTIO(tx.inputs, conf.address),
        isCoinbase: tx.totalFactoidOutputs === 0,
    };

    logger.debug(`Saving new transaction for address ${txRow.address} at block ${txRow.height}`);
    return txTable.insertRawTransactionRow(txRow);
}

/**
 * Loops over past heights to fill in historical transaction data.
 */
export async function fetchNewTransactions(
    transactionTable: TransactionTable,
    configStartHeight: number,
    factom: Factom
) {
    try {
        // Find the maximum processed height.
        const m = await transactionTable.getMaxHeight();
        // If the config start height is ahead of the DB, we'll use that instead.
        const maxHeight = m > configStartHeight ? m : configStartHeight;
        // Find the height at the tip of the blockchain.
        const { directoryBlockHeight: stopHeight } = await factom.cli.getHeights();

        // Loop over missing heights.
        logger.info(`Fetching new tranactions between ${maxHeight} and ${stopHeight}`);
        for (let i = maxHeight + 1; i <= stopHeight; i++) {
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

/**
 * Creates a transaction listener which handles all new and old transactions.
 * @param {AddressConfig} conf Config for a specific address.
 */
export function createTransactionListener(conf: AddressConfig, transactionTable: TransactionTable) {
    return async function (tx: Transaction) {
        await saveNewTransaction(tx, conf, transactionTable).catch((e) => {
            logger.error(`Fatal error. Failed to save transaction to database: `, e);
            process.exit(1);
        });
    };
}
