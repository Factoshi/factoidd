import { stringify } from 'querystring';
import Bottleneck from 'bottleneck';
import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { config } from './init';
import { asyncCompose, warn } from './utils';
import { Config, TransactionRow, PriceApiParams } from './types';

axiosRetry(axios, { retries: 5, retryDelay: exponentialDelay });

export const getPriceAPIParams = (conf: Config) => {
    const { secret } = conf.cryptocompare;
    const headers = { authorization: secret };
    const rootUri = 'https://min-api.cryptocompare.com/data/histohour?';
    return ({ timestamp, currency }: TransactionRow): PriceApiParams => ({
        timestamp: timestamp!,
        currency,
        headers,
        rootUri
    });
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
    getPriceAPIMethod(config),
    handlePriceApiResponse
);
