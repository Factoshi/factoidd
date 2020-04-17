import winston from 'winston';

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
    getConfigPath,
    getDatabasePath,
    initialiseDatabase,
    createIncomeCSVFile,
    batchUpdateCSV,
} from '../lib';

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
process.on('unhandledRejection', (_, promise) => {
    console.error(promise);
    process.exit(1);
});

export async function processSavedTransactions(db: TransactionTable, conf: Config, appdir: string) {
    try {
        const { bitcoinTax, cryptocompare, startHeight, ...keys } = conf.options;
        await batchUpdatePrice(db, cryptocompare);
        if (bitcoinTax) {
            await batchUpdateIncome(db, keys);
        } else {
            logger.debug('Skipping bitcoin.tax');
        }
        await batchUpdateCSV(db, appdir);
    } catch (e) {
        logger.error('Error while processing new transactions\n', e);
        logger.warn('Failed to finish processing transaction(s). Will try again later.');
    }
}

// Main function.
export async function app(level: string, appdir: string) {
    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: level,
        stderrLevels: ['error'],
    });
    logger.add(consoleTransport);
    logger.info(`Log level: ${level}`);

    // Instantiate Config singleton.
    const configPath = getConfigPath(appdir);
    const config = new Config(configPath);

    // Instantiate factom and check connection to factomd.
    const factom = new Factom(config.factomd);
    await factom.testConnection();

    // Open database connection and instantiate table classes.
    const dbPath = getDatabasePath(appdir);
    const db = await initialiseDatabase(dbPath);
    const transactionTable = new TransactionTable(db);
    await transactionTable.createTransactionTable();

    // Create the CSV files to record transactions
    config.addresses.forEach(({ address }) => createIncomeCSVFile(appdir, address));

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
    while (true) {
        await processSavedTransactions(transactionTable, config, appdir);
        await new Promise((resolve) => setTimeout(resolve, 600000)); // Sleep for 10 minutes
    }
}
