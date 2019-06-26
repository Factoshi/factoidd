import { stringify } from 'querystring';
import Bottleneck from 'bottleneck';
import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { config } from './init';
import { asyncCompose, warn, toInteger } from './utils';
import { Config, TransactionRow, PriceApiParams } from './types';

axiosRetry(axios, { retries: 2, retryDelay: exponentialDelay });

export const getPriceAPIParams = (conf: Config) => {
    const { secret } = conf.cryptocompare;
    const headers = { authorization: secret };
    const rootUri = 'https://min-api.cryptocompare.com/data/';
    return ({ timestamp, currency }: TransactionRow): PriceApiParams => ({
        timestamp: timestamp!,
        currency,
        headers,
        rootUri
    });
};

// Cryptocompare has minute-level data for the last week, and hourly data before that.
// This method sets the correct timeframe given the age of the transaction.
export const setTimeframe = (params: PriceApiParams): PriceApiParams => {
    const now = toInteger(Date.now() / 1000);
    // Set week period to slightly less than a week for a margin of safety.
    const oneWeekAgoInSeconds = now - 600000;
    if (params.timestamp > oneWeekAgoInSeconds) {
        return { ...params, rootUri: params.rootUri + 'histominute?' };
    } else {
        return { ...params, rootUri: params.rootUri + 'histohour?' };
    }
};

export const getPriceAPIMethod = (conf: Config) => {
    const { minTime } = conf.options;
    const limiter = new Bottleneck({ minTime });
    return ({ timestamp, currency, headers, rootUri }: PriceApiParams) => {
        const queryString = stringify({
            fsym: 'FCT',
            tsym: currency,
            limit: 1,
            toTs: timestamp
        });
        const uri = rootUri + queryString;
        return limiter.schedule(() => axios.get(uri, { headers }));
    };
};

export const handlePriceApiResponse = ({ data }: any) => {
    if (data.Response !== 'Success') {
        throw new Error(`call to cryptocompare failed: ${data.Message}`);
    }
    if (data.HasWarning) {
        warn('Rate limit exceeded. Increase minTime.', data.RateLimit);
    }
    // Return the closing price
    return data.Data[1].close;
};

export const fetchPrice = asyncCompose<number>(
    getPriceAPIParams(config),
    setTimeframe,
    getPriceAPIMethod(config),
    handlePriceApiResponse
);
