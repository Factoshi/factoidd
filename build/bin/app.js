"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const bottleneck_1 = __importDefault(require("bottleneck"));
const config_1 = require("./config");
const lib_1 = require("../lib");
const init_1 = require("./init");
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
        const filename = init_1.getDatabasePath();
        lib_1.logger.info(`Opening database connection at ${filename}`);
        return sqlite_1.open({ filename, driver: sqlite3_1.default.Database });
    }
    catch (e) {
        lib_1.logger.error('Could not connect to database: ', e);
        process.exit(1);
    }
}
function createProcessSavedTransactionsFunc(transactionTable, config) {
    return async () => {
        const bottleneck = new bottleneck_1.default({ minTime: 500 });
        try {
            await lib_1.batchUpdatePrice(transactionTable, bottleneck, config.options.cryptocompare);
            if (config.options.bitcoinTax) {
                const { bitcoinTaxKey: key, bitcoinTaxSecret: secret } = config.options;
                await lib_1.batchUpdateBitcoinTax(transactionTable, bottleneck, {
                    secret,
                    key,
                });
            }
            else {
                lib_1.logger.debug('Skipping bitcoin.tax');
            }
        }
        catch (e) {
            console.log(e);
            lib_1.logger.warn('Failed to finish processing transaction(s). Will try again later.', e);
        }
    };
}
exports.createProcessSavedTransactionsFunc = createProcessSavedTransactionsFunc;
// Main function.
async function app(level) {
    // Set logger.
    const consoleTransport = new winston_1.default.transports.Console({
        level: level,
        stderrLevels: ['error', 'warn'],
    });
    lib_1.logger.add(consoleTransport);
    lib_1.logger.info(`Log level: ${level}`);
    // Instantiate Config singleton.
    const configPath = init_1.getConfigPath();
    const config = new config_1.Config(configPath);
    // Instantiate factom and check connection to factomd.
    const factom = new lib_1.Factom(config.factomd);
    await factom.testConnection();
    // Open database connection and instantiate table classes.
    const db = await initialiseDatabase();
    const transactionTable = new lib_1.TransactionTable(db);
    await transactionTable.createTransactionTable();
    // Create the transaction listeners to save new transactions.
    factom.event.on('error', (e) => lib_1.logger.error('Factom event error:', e));
    config.addresses.forEach((addressConf) => {
        const { address } = addressConf;
        lib_1.logger.info(`Listening for new transactions to address ${address}`);
        factom.event.on(address, lib_1.createTransactionListener(addressConf, transactionTable));
    });
    // Scan blockchain for new transactions.
    lib_1.logger.info('Scanning blockchain for new transactions.');
    lib_1.logger.warn('Transactions will be processed after the scan is complete.');
    await lib_1.fetchNewTransactions(transactionTable, config.options.startHeight, factom);
    // Process all new found transactions.
    lib_1.logger.info('Processing all new transactions...');
    const processSavedTransactions = createProcessSavedTransactionsFunc(transactionTable, config);
    await processSavedTransactions();
    setInterval(() => processSavedTransactions, 600000); // Repeat processing once every 10 minutes.
}
exports.app = app;
