import { stringify } from 'querystring';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';
import { Config } from './config';
import { toInteger } from './utils';

import { TransactionTable } from './db';
import { logger } from './logger';
import Bottleneck from 'bottleneck';

axiosRetry(axios, { retries: 2, retryDelay: exponentialDelay });

async function getPrice({ currency, timestamp }: { currency: string; timestamp: number }) {
    // API can deliver per minute pricing if timestamp within past week, or hourly pricing
    // if timestamp was from before that.
    // prettier-ignore
    const timePrecision = timestamp > toInteger(Date.now() / 1000) - 600000 
            ? 'histominute' 
            : 'histohour';

    const queryString = stringify({
        fsym: 'FCT',
        tsym: currency,
        limit: 1,
        toTs: timestamp,
    });
    const uri = `https://min-api.cryptocompare.com/data/${timePrecision}?${queryString}`;
    const headers = { authorization: `Apikey ${Config.cryptocompare.secret}` };

    // Fetch the pricing data.
    const response = await axios.get(uri, { headers });

    // Handle the response.
    if (response.data.Response !== 'Success') {
        throw new Error(`call to cryptocompare failed: ${response.data.Message}`);
    }
    if (response.data.HasWarning) {
        logger.warn('Rate limit exceeded. Increase minTime.', response.data.RateLimit);
    }

    // Set the closing price
    return response.data.Data[1].close;
}

/**
 * Function fills in price data for all transactions in DB with missing data.
 */
export async function batchUpdatePrice(txTable: TransactionTable, bottleneck: Bottleneck) {
    const nullPriceTransactions = await txTable.getTransactionsWithNullPrice();
    logger.info(`Fetching price data for ${nullPriceTransactions.length} transactions.`);

    for (let { rowid, currency, timestamp, txhash, height } of nullPriceTransactions) {
        const price = await bottleneck.schedule(() => getPrice({ currency, timestamp }));

        const msg = `Updating price for transaction ${txhash} at height ${height} to ${price} ${currency}`;
        logger.info(msg);
        await txTable.updatePrice(rowid, price);
    }
}
