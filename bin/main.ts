import { resolve } from 'path';
import winston from 'winston';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import Bottleneck from 'bottleneck';

import { program } from './options';
import {
    factom,
    logger,
    Config,
    AddressConfig,
    createTransactionListener,
    fetchHistoricalTransactions,
    TransactionTable,
    batchUpdatePrice,
    batchUpdateBitcoinTax,
} from '../lib';

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
process.on('unhandledRejection', (_, promise) => {
    console.error(promise);
    process.exit(1);
});

/**
 * Create an open sqlite3 database connection.
 * @param path Path to Sqlite database.
 */
async function initialiseDatabase(path: string) {
    const filename = resolve(path, 'factoidd.db');
    logger.info(`Opening database connection at ${filename}`);
    return open({ filename, driver: sqlite3.Database });
}

export function createProcessSavedTransactionsFunc(
    transactionTable: TransactionTable,
    shouldUpdateBitcoinTax: boolean
) {
    return async () => {
        try {
            const bottleneck = new Bottleneck({ minTime: Config.options.minTime });
            await batchUpdatePrice(transactionTable, bottleneck);
            if (shouldUpdateBitcoinTax) {
                await batchUpdateBitcoinTax(transactionTable, bottleneck);
            } else {
                logger.debug('Skipping bitcoin.tax');
            }
        } catch (e) {
            console.log(e);
            logger.warn('Failed to finish processing transaction(s). Will try again later.', e);
        }
    };
}

// Main function.
(async function () {
    // Get command line args
    program.parse(process.argv);

    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: program.loglvl,
        stderrLevels: ['error', 'warn'],
    });
    logger.add(consoleTransport);
    logger.info(`Log level: ${program.loglvl}`);

    // Instantiate Config singleton.
    Config.instantiateSingleton(program.config);

    // Open database connection and instantiate table classes.
    const db = await initialiseDatabase(program.db);
    const transactionTable = new TransactionTable(db);
    await transactionTable.createTransactionTable();

    // Create the transaction listeners to save new transactions.
    factom.event.on('error', (e) => logger.error('Factom event error:', e));
    Config.addresses.forEach((addressConf: AddressConfig) => {
        logger.info(`Listening for new transactions to address ${addressConf.address}`);
        factom.event.on(
            addressConf.address,
            createTransactionListener(addressConf, transactionTable)
        );
    });

    // Scan blockchain for new transactions.
    logger.info('Scanning blockchain for new transactions.');
    logger.warn('Transactions will be processed after the scan is complete.');
    await fetchHistoricalTransactions(transactionTable);

    // Process all new found transactions.
    logger.info('Processing all new transactions...');
    const shouldUpdateBitcoinTax =
        Config.bitcoinTax && Config.bitcoinTax.secret && Config.bitcoinTax.key;
    const processSavedTransactions = createProcessSavedTransactionsFunc(
        transactionTable,
        !!shouldUpdateBitcoinTax
    );
    await processSavedTransactions();
    setInterval(() => processSavedTransactions, 600000); // Repeat processing once every 10 minutes.
})();
