import axios, { AxiosResponse } from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { config } from './init';
import { Config, TransactionRow, BitcoinTaxParams } from './types';
import { asyncCompose, info } from './utils';
import Bottleneck from 'bottleneck';

axiosRetry(axios, { retries: 5, retryDelay: exponentialDelay });

export const removeUnwantedFields = (txRow: TransactionRow): TransactionRow => {
    const { height, timestamp, ...rest } = txRow;
    return { ...rest };
};

export const getBitcoinTaxParams = (conf: Config) => {
    // Setup done once on initialisation.
    const { secret, key } = conf.bitcoinTax;
    const shouldSubmitToBitcoinTax = secret !== undefined && key !== undefined;
    if (shouldSubmitToBitcoinTax) {
        var headers = { 'X-APIKEY': key, 'X-APISECRET': secret };
        var uri = 'https://api.bitcoin.tax/v1/transactions';
    } else {
        info('Skipping bitcoin.tax: secret and key not set.');
    }
    return (txRow: TransactionRow) => ({ uri, txRow, headers });
};

export const getBitcoinTaxCall = (conf: Config) => {
    const limiter = new Bottleneck({ minTime: conf.options.minTime });
    return ({ uri, txRow, headers }: BitcoinTaxParams) => {
        if (headers !== undefined && uri !== undefined) {
            return limiter.schedule(() => axios.post(uri, txRow, { headers }));
        }
    };
};

export const handleBitcoinTaxResponse = (response: AxiosResponse<any> | undefined) => {
    if (response && response.data.status !== 'success') {
        throw new Error(JSON.stringify(response.data));
    }
};

export const saveRowToBitcoinTax = asyncCompose(
    removeUnwantedFields,
    getBitcoinTaxParams(config),
    getBitcoinTaxCall(config),
    handleBitcoinTaxResponse
);
