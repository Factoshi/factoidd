import factom, { FactomCli, FactomEventEmitter, Transaction, DirectoryBlock } from 'factom';
import winston from 'winston';
import { Database } from 'sqlite';

import { logger } from './logger';
import { AddressTransaction } from './transaction';
import { appendToCSV, createCSVFile } from './csv';
import { Config } from './config';
import { initDB, saveTransaction } from './db';
import { SigIntListener } from './utils';

/**
 * Loops over past heights to fill in historical transaction data.
 */
export async function scanBlockchain(db: Database, conf: Config, cli: FactomCli, to: number) {
    // Find the maximum processed height.
    const m = await db.get('SELECT MAX(height) FROM transactions;');
    const lastHeight = m['MAX(height)'] || -1;

    // If the config start height is ahead of the DB, we'll use that instead.
    const startHeight =
        lastHeight >= conf.options.startHeight ? lastHeight + 1 : conf.options.startHeight;

    for (let i = startHeight; i <= to; i++) {
        if (i % 1000 === 0) logger.info(`Scanning block height: ${i}`);
        const directoryBlock = await cli.getDirectoryBlock(i);
        await handleNewBlock(cli, db, conf, directoryBlock);
    }
}

export async function handleNewBlock(cli: FactomCli, db: Database, conf: Config, b: DirectoryBlock) {
    const f = await cli.getFactoidBlock(b.factoidBlockRef);
    for (const tx of f.transactions) {
        await handleNewTransaction(db, conf, tx);
    }
}

async function handleNewTransaction(db: Database, conf: Config, tx: Transaction) {
    for (const a of conf.addresses) {
        const at = new AddressTransaction(tx, a);

        if (!at.isRelevant()) {
            continue;
        }

        const s = SigIntListener.getInstance();
        s.lock();

        try {
            await at.populatePrice(conf.options.currency, conf.keys.cryptocompare);
            if (conf.keys.bitcoinTax) {
                await at.submitToBT(conf.keys.bitcoinTaxSecret, conf.keys.bitcoinTaxKey);
            }
            appendToCSV(at);
            await saveTransaction(db, at);
        } catch (err) {
            logger.error(`failed to process tx ${at.tx.id}.`);
            logger.error(`your records may be inconsistent.`);
            console.log(err);
            process.exit(1);
        }

        at.log();
        s.unlock();
    }
}

export async function main() {
    SigIntListener.init();

    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: process.env.FACTOIDD_LOG_LVL || 'info',
        stderrLevels: ['error'],
    });
    logger.add(consoleTransport);

    const conf = new Config();
    const db = await initDB();
    const cli = new FactomCli(conf.factomd);

    // Create the CSV files to record transactions
    logger.info('Creating CSV files');
    conf.addresses.forEach(({ name }) => createCSVFile(name));

    // Scan blockchain for new transactions.
    logger.info('Scanning blockchain for new transactions');

    // Scans inside a loop until we are entirely caught up with the tip of the chain
    for (let lastHeight = 0; ; ) {
        const { directoryBlockHeight } = await cli.getHeights();
        if (directoryBlockHeight === lastHeight) {
            break;
        }
        await scanBlockchain(db, conf, cli, directoryBlockHeight);
        lastHeight = directoryBlockHeight;
    }

    logger.info(`Scan complete. Listening for new blocks`);

    // Listens for new directory blocks by polling factomd
    const e = new FactomEventEmitter(cli);

    e.on('newDirectoryBlock', async (directoryBlock: factom.DirectoryBlock) => {
        try {
            await handleNewBlock(cli, db, conf, directoryBlock);
        } catch (err) {
            logger.error(`Error on processing new block`, err);
            process.exit(1);
        }
    });

    e.on('error', (err) => {
        logger.error('Factom event error:', err);
        process.exit(1);
    });
}
