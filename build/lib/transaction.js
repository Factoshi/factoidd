"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_retry_1 = __importStar(require("axios-retry"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("./utils");
const logger_1 = require("./logger");
axios_retry_1.default(axios_1.default, { retries: 2, retryDelay: axios_retry_1.exponentialDelay });
function sumFCTIO(inputsOutputs, address) {
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
function saveNewTransaction(tx, conf, txTable) {
    const txRow = {
        address: conf.address,
        timestamp: utils_1.toInteger(tx.timestamp / 1000),
        date: new Date(tx.timestamp).toISOString(),
        txhash: tx.id,
        height: tx.blockContext.directoryBlockHeight,
        symbol: 'FCT',
        currency: conf.currency,
        receivedFCT: sumFCTIO(tx.factoidOutputs, conf.address),
        sentFCT: sumFCTIO(tx.inputs, conf.address),
        isCoinbase: tx.totalFactoidOutputs === 0,
    };
    logger_1.logger.debug(`Saving new transaction for address ${txRow.address} at block ${txRow.height}`);
    return txTable.insertRawTransactionRow(txRow);
}
/**
 * Loops over past heights to fill in historical transaction data.
 */
async function fetchNewTransactions(transactionTable, configStartHeight, factom) {
    try {
        // Find the maximum processed height.
        const m = await transactionTable.getMaxHeight();
        // If the config start height is ahead of the DB, we'll use that instead.
        const maxHeight = m > configStartHeight ? m : configStartHeight;
        // Find the height at the tip of the blockchain.
        const { directoryBlockHeight: stopHeight } = await factom.cli.getHeights();
        // Loop over missing heights.
        logger_1.logger.info(`Fetching new tranactions between ${maxHeight} and ${stopHeight}`);
        for (let i = maxHeight + 1; i <= stopHeight; i++) {
            if (i % 1000 === 0)
                logger_1.logger.info(`Scanning block height: ${i}`);
            const directoryBlock = await factom.cli.getDirectoryBlock(i);
            // Each directory block is fed into the event emitter. That will emit factoid transactions
            // for the addresses held in the config to be processed in the same manner as new found transactions.
            factom.event.handleDirectoryBlock(directoryBlock);
        }
        logger_1.logger.info(`Scan complete`);
    }
    catch (e) {
        logger_1.logger.error('Fatal error. Unable to backfill transactions: ', e);
        process.exit(1);
    }
}
exports.fetchNewTransactions = fetchNewTransactions;
/**
 * Creates a transaction listener which handles all new and old transactions.
 * @param {AddressConfig} conf Config for a specific address.
 */
function createTransactionListener(conf, transactionTable) {
    return async function (tx) {
        await saveNewTransaction(tx, conf, transactionTable).catch((e) => {
            logger_1.logger.error(`Fatal error. Failed to save transaction to database: `, e);
            process.exit(1);
        });
    };
}
exports.createTransactionListener = createTransactionListener;
