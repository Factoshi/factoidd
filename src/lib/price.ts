import { stringify } from 'querystring';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';

import { TransactionTable } from './db';
import { logger } from './logger';
import Bottleneck from 'bottleneck';

axiosRetry(axios, { retries: 2, retryDelay: exponentialDelay });

async function getPrice(currency: string, timestamp: number, secret: string) {
    // API can deliver per minute pricing if timestamp within past week, or hourly pricing
    // if timestamp was from before that. 600000 seconds is a week minus a little bit to be safe.
    // prettier-ignore
    const timePrecision = timestamp > Date.now() / 1000 - 600000 
            ? 'histominute' 
            : 'histohour';

    const queryString = stringify({
        fsym: 'FCT',
        tsym: currency,
        limit: 1,
        toTs: timestamp,
    });
    const uri = `https://min-api.cryptocompare.com/data/${timePrecision}?${queryString}`;
    const headers = { authorization: `Apikey ${secret}` };

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
export async function batchUpdatePrice(db: TransactionTable, secret: string, minTime = 500) {
    const transactions = await db.getTransactionsWithNullPrice();
    if (transactions.length === 0) {
        return;
    }
    const bottleneck = new Bottleneck({ minTime });

    logger.info(`Fetching price data for ${transactions.length} transaction(s)`);
    for (let [i, { rowid, currency, timestamp, txhash }] of transactions.entries()) {
        if (i % 10 === 0) {
            logger.info(`Fetching price data for transaction ${i} of ${transactions.length}`);
        }
        const price = await bottleneck.schedule(() => getPrice(currency, timestamp, secret));
        await db.updatePrice(rowid, price);
        logger.debug(`Saved price ${price} ${currency} for transaction ${txhash}`);
    }

    logger.info(`Finished fetching price data for ${transactions.length} transaction(s)`);
}
