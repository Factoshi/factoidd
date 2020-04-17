import winston from 'winston';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import Bottleneck from 'bottleneck';

import {
    Config,
    Factom,
    logger,
    AddressConfig,
    saveNewTransaction,
    emitNewTransactions,
    TransactionTable,
    batchUpdatePrice,
    batchUpdateIncome,
    getDefaultConfigPath,
    getDefaultDatabasePath,
} from '../lib';
import { getConfigPath, getDatabasePath } from './init';

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
async function initialiseDatabase() {
    try {
        const filename = getDatabasePath();
        logger.info(`Opening database connection to ${filename}`);
        return open({ filename, driver: sqlite3.Database });
    } catch (e) {
        logger.error('Could not connect to database: ', e);
        process.exit(1);
    }
}

export function createProcessSavedTransactionsFunc(
    transactionTable: TransactionTable,
    config: Config
) {
    return async () => {
        try {
            const bottleneck = new Bottleneck({ minTime: 500 });
            const { bitcoinTax, cryptocompare, startHeight, ...keys } = config.options;
            await batchUpdatePrice(transactionTable, bottleneck, cryptocompare);
            if (bitcoinTax) {
                await batchUpdateIncome(transactionTable, bottleneck, keys);
            } else {
                logger.debug('Skipping bitcoin.tax');
            }
        } catch (e) {
            logger.error('Error while processing new transactions\n', e);
            logger.warn('Failed to finish processing transaction(s). Will try again later.');
        }
    };
}

// Main function.
export async function app(level: string) {
    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: level,
        stderrLevels: ['error', 'warn'],
    });
    logger.add(consoleTransport);
    logger.info(`Log level: ${level}`);

    // Instantiate Config singleton.
    const configPath = getDefaultConfigPath();
    const config = new Config(configPath);

    // Instantiate factom and check connection to factomd.
    const factom = new Factom(config.factomd);
    await factom.testConnection();

    // Open database connection and instantiate table classes.
    const dbPath = getDefaultDatabasePath();
    const db = await initialiseDatabase(dbPath);
    const transactionTable = new TransactionTable(db);
    await transactionTable.createTransactionTable();

    // Create the transaction listeners to save new transactions.
    factom.event.on('error', (e) => logger.error('Factom event error:', e));
    config.addresses.forEach((addressConf: AddressConfig) => {
        const { address } = addressConf;
        logger.info(`Listening for new transactions to address ${address}`);
        factom.event.on(address, (tx) => saveNewTransaction(addressConf, transactionTable, tx));
    });

    // Scan blockchain for new transactions.
    logger.info('Scanning blockchain for new transactions.');
    logger.warn('Transactions will be processed after the scan is complete.');
    await emitNewTransactions(transactionTable, config.options.startHeight, factom);

    // Process all new found transactions.
    logger.info('Processing new transactions...');
    const processSavedTransactions = createProcessSavedTransactionsFunc(transactionTable, config);
    await processSavedTransactions();
    setInterval(() => processSavedTransactions(), 600000); // Repeat processing once every 10 minutes.
}

// TODO: sort out testing
// TODO: add CSV
