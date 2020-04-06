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
const logger_1 = require("./logger");
axios_retry_1.default(axios_1.default, { retries: 2, retryDelay: axios_retry_1.exponentialDelay });
var BitcoinTaxAction;
(function (BitcoinTaxAction) {
    BitcoinTaxAction["SELL"] = "SELL";
    BitcoinTaxAction["BUY"] = "BUY";
    BitcoinTaxAction["INCOME"] = "INCOME";
    BitcoinTaxAction["GIFTING"] = "GIFTING";
    BitcoinTaxAction["MINING"] = "MINING";
    BitcoinTaxAction["SPEND"] = "SPEND";
    BitcoinTaxAction["GIFT"] = "GIFT";
    BitcoinTaxAction["DONATION"] = "DONATION";
})(BitcoinTaxAction || (BitcoinTaxAction = {}));
var BitcoinTaxSymbol;
(function (BitcoinTaxSymbol) {
    BitcoinTaxSymbol["FCT"] = "FCT";
})(BitcoinTaxSymbol || (BitcoinTaxSymbol = {}));
function formatTranactionRow(txRow) {
    return {
        date: txRow.date,
        action: BitcoinTaxAction.INCOME,
        symbol: BitcoinTaxSymbol.FCT,
        currency: txRow.currency,
        volume: txRow.receivedFCT,
        price: txRow.price,
        memo: txRow.txhash,
        txhash: txRow.txhash,
        recipient: txRow.address,
    };
}
async function saveToBitcoinTax(data, keys) {
    const { key, secret } = keys;
    var headers = { 'X-APIKEY': key, 'X-APISECRET': secret };
    var uri = 'https://api.bitcoin.tax/v1/transactions';
    await axios_1.default.post(uri, data, { headers });
}
/**
 * Function fills in price data for all transactions in DB with missing data.
 */
async function batchUpdateBitcoinTax(txTable, bottleneck, keys) {
    const uncommittedTransactions = await txTable.getUncommittedTransactions();
    // Filter to get only income transactions with known price. This can be updated later if adding other action types.
    const transactions = uncommittedTransactions.filter((tx) => tx.receivedFCT > 0 && tx.price);
    logger_1.logger.info(`Committing ${transactions.length} transaction(s) to bitcoin.tax`);
    for (let { rowid, ...rest } of transactions) {
        const data = formatTranactionRow(rest);
        await bottleneck.schedule(() => saveToBitcoinTax(data, keys));
        await txTable.updateBitcoinTax(rowid, true).catch((e) => {
            // Failure to write to database after committing to bitcoin tax is a fatal
            // error that cannot be recovered.
            logger_1.logger.error('Fatal error. Database has inconsistent state.\n', e);
            process.exit(1);
        });
        logger_1.logger.info(`Committed transaction ${data.memo} to bitoin.tax`);
    }
}
exports.batchUpdateBitcoinTax = batchUpdateBitcoinTax;
