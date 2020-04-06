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
const querystring_1 = require("querystring");
const axios_retry_1 = __importStar(require("axios-retry"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("./utils");
const logger_1 = require("./logger");
axios_retry_1.default(axios_1.default, { retries: 2, retryDelay: axios_retry_1.exponentialDelay });
async function getPrice(currency, timestamp, secret) {
    // API can deliver per minute pricing if timestamp within past week, or hourly pricing
    // if timestamp was from before that.
    // prettier-ignore
    const timePrecision = timestamp > utils_1.toInteger(Date.now() / 1000) - 600000
        ? 'histominute'
        : 'histohour';
    const queryString = querystring_1.stringify({
        fsym: 'FCT',
        tsym: currency,
        limit: 1,
        toTs: timestamp,
    });
    const uri = `https://min-api.cryptocompare.com/data/${timePrecision}?${queryString}`;
    const headers = { authorization: `Apikey ${secret}` };
    // Fetch the pricing data.
    const response = await axios_1.default.get(uri, { headers });
    // Handle the response.
    if (response.data.Response !== 'Success') {
        throw new Error(`call to cryptocompare failed: ${response.data.Message}`);
    }
    if (response.data.HasWarning) {
        logger_1.logger.warn('Rate limit exceeded. Increase minTime.', response.data.RateLimit);
    }
    // Set the closing price
    return response.data.Data[1].close;
}
/**
 * Function fills in price data for all transactions in DB with missing data.
 */
async function batchUpdatePrice(txTable, bottleneck, secret) {
    const nullPriceTransactions = await txTable.getTransactionsWithNullPrice();
    logger_1.logger.info(`Fetching price data for ${nullPriceTransactions.length} transactions.`);
    for (let { rowid, currency, timestamp, txhash, height } of nullPriceTransactions) {
        const price = await bottleneck.schedule(() => getPrice(currency, timestamp, secret));
        const msg = `Updating price for transaction ${txhash} at height ${height} to ${price} ${currency}`;
        logger_1.logger.info(msg);
        await txTable.updatePrice(rowid, price);
    }
}
exports.batchUpdatePrice = batchUpdatePrice;
