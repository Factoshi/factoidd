import winston from 'winston';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import Bottleneck from 'bottleneck';

import { Config } from './config';
import {
    Factom,
    logger,
    AddressConfig,
    createTransactionListener,
    fetchNewTransactions,
    TransactionTable,
    batchUpdatePrice,
    batchUpdateBitcoinTax,
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
        logger.info(`Opening database connection at ${filename}`);
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
        const bottleneck = new Bottleneck({ minTime: 500 });

        try {
            await batchUpdatePrice(transactionTable, bottleneck, config.options.cryptocompare);
            if (config.options.bitcoinTax) {
                const { bitcoinTaxKey: key, bitcoinTaxSecret: secret } = config.options;
                await batchUpdateBitcoinTax(transactionTable, bottleneck, {
                    secret,
                    key,
                });
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
export async function app(level: string) {
    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: level,
        stderrLevels: ['error', 'warn'],
    });
    logger.add(consoleTransport);
    logger.info(`Log level: ${level}`);

    // Instantiate Config singleton.
    const configPath = getConfigPath();
    const config = new Config(configPath);

    // Instantiate factom and check connection to factomd.
    const factom = new Factom(config.factomd);
    await factom.testConnection();

    // Open database connection and instantiate table classes.
    const db = await initialiseDatabase();
    const transactionTable = new TransactionTable(db);
    await transactionTable.createTransactionTable();

    // Create the transaction listeners to save new transactions.
    factom.event.on('error', (e) => logger.error('Factom event error:', e));
    config.addresses.forEach((addressConf: AddressConfig) => {
        const { address } = addressConf;
        logger.info(`Listening for new transactions to address ${address}`);
        factom.event.on(address, createTransactionListener(addressConf, transactionTable));
    });

    // Scan blockchain for new transactions.
    logger.info('Scanning blockchain for new transactions.');
    logger.warn('Transactions will be processed after the scan is complete.');
    await fetchNewTransactions(transactionTable, config.options.startHeight, factom);

    // Process all new found transactions.
    logger.info('Processing all new transactions...');
    const processSavedTransactions = createProcessSavedTransactionsFunc(transactionTable, config);
    await processSavedTransactions();
    setInterval(() => processSavedTransactions, 600000); // Repeat processing once every 10 minutes.
}
