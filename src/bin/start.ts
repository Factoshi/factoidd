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
    createCSVFile,
    batchUpdateCSV,
    CSVSubDir,
    QuitListener,
    KeyConfig,
} from '../lib';

async function processSavedTransactions(
    db: TransactionTable,
    keys: KeyConfig,
    appdir: string,
    quitListener: QuitListener
) {
    try {
        const { bitcoinTax, cryptocompare, ...bitcoinTaxKeys } = keys;
        await batchUpdatePrice(db, cryptocompare);
        if (bitcoinTax) {
            await batchUpdateIncome(db, bitcoinTaxKeys, quitListener);
        } else {
            logger.debug('Skipping bitcoin.tax');
        }
        await batchUpdateCSV(db, appdir, quitListener);
    } catch (e) {
        logger.error('Error while processing new transactions\n', e);
        logger.warn('Failed to finish processing transaction(s). Will try again later.');
    }
}

// Main function.
export async function start(level: string, appdir: string) {
    // There are instances where the programme should not shutdown immediately.
    // quitListener controls shutdown process to allow critical transaction to complete.
    const quitListener = new QuitListener();
    process.on('SIGTERM', () => quitListener.setShouldQuit(true));
    process.on('SIGINT', () => quitListener.setShouldQuit(true));
    process.on('unhandledRejection', (_, promise) => {
        console.error(promise);
        process.exit(1);
    });

    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: level,
        stderrLevels: ['error'],
    });
    logger.add(consoleTransport);

    // Log args
    logger.warn(`Log level: ${level}`);
    logger.warn(`App directory: ${appdir}`);

    // Instantiate Config singleton.
    const configPath = getConfigPath(appdir);
    const config = new Config(configPath);

    // Open database connection and instantiate table classes.
    const dbPath = getDatabasePath(appdir);
    const db = await initialiseDatabase(dbPath);
    const transactionTable = new TransactionTable(db);
    await transactionTable.createTransactionTable();

    // Instantiate factom and check connection to factomd.
    const factom = new Factom(config.factomd);
    await factom.testConnection();

    // Create the CSV files to record transactions
    logger.info('Creating CSV files');
    config.addresses.forEach(({ name }) => createCSVFile(appdir, CSVSubDir.INCOME, name));

    // Create the transaction listeners to save new transactions.
    factom.event.on('error', (e) => {
        logger.error('Factom event error:', e);
        process.exit(1);
    });

    config.addresses.forEach((addressConf: AddressConfig) => {
        const { address } = addressConf;
        const { currency } = config.options;
        logger.info(`Listening for new transactions to address ${address}`);
        factom.event.on(address, (tx) =>
            saveNewTransaction(addressConf, transactionTable, tx, currency)
        );
    });

    // Scan blockchain for new transactions.
    logger.info('Scanning blockchain for new transactions');
    logger.info('Transactions will be processed after the scan is complete');
    await emitNewTransactions(transactionTable, config.options.startHeight, factom);

    while (true) {
        await processSavedTransactions(transactionTable, config.keys, appdir, quitListener);
        await new Promise((resolve) => setTimeout(resolve, 60000)); // Sleep for 1 minute
    }
}
