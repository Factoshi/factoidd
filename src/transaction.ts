import { stringify } from 'querystring';

import axios from 'axios';
import factom from 'factom';
import axiosRetry, { exponentialDelay } from 'axios-retry';

import { toInteger } from './utils';
import { logger } from './logger';
import { AddressConfig } from './config';
import { RateLimiter } from './rateLimiter';

axiosRetry(axios, { retryDelay: exponentialDelay });

export class Transaction {
    tx: factom.Transaction;
    price?: number;
    currency?: string;

    constructor(tx: factom.Transaction) {
        this.tx = tx;
    }

    get date() {
        return new Date(this.tx.timestamp).toISOString();
    }

    get timestamp() {
        return toInteger(this.tx.timestamp / 1000);
    }

    get height() {
        return this.tx.blockContext.directoryBlockHeight;
    }

    received(addr: AddressConfig) {
        // prettier-ignore
        return this.tx.factoidOutputs
                .filter((io) => io.address === addr.address)
                .reduce((total, current) => (total += current.amount), 0) * Math.pow(10, -8);
    }

    // isRelevant determines whether or not this transaction meets the criteria set by the address config
    isRelevant(addr: AddressConfig) {
        if (this.received(addr) == 0) {
            return false;
        }

        const { coinbase, nonCoinbase } = addr;

        // Address may only record coinbase or non-coinbsae tranactions.
        const isCoinbase = this.tx.totalInputs === 0;
        return (isCoinbase && coinbase) || (!isCoinbase && nonCoinbase);
    }

    async populatePrice(currency: string, secret: string) {
        if (this.price != undefined && this.currency == currency) {
            return;
        }

        const timePrecision = this.timestamp > Date.now() / 1000 - 600000 ? 'histominute' : 'histohour';

        const queryString = stringify({
            fsym: 'FCT',
            tsym: currency,
            limit: 1,
            toTs: this.timestamp,
        });

        const uri = `https://min-api.cryptocompare.com/data/${timePrecision}?${queryString}`;
        const headers = { authorization: `Apikey ${secret}` };

        const limiter = RateLimiter.getInstance();

        // Fetch the pricing data.
        const response = await limiter.scheduleCryptocompare(() => axios.get(uri, { headers }));

        // Handle the response.
        if (response.data.Response !== 'Success') {
            throw new Error(`call to cryptocompare failed: ${response.data.Message}`);
        }
        if (response.data.HasWarning) {
            logger.warn('Rate limit exceeded. Increase minTime.', response.data.RateLimit);
        }

        this.price = response.data.Data[1].close;
        this.currency = currency;
    }
}
