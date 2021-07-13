import factom, { Transaction } from 'factom';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';
import { stringify } from 'querystring';

import { toInteger, to8DecimalPlaces } from './utils';
import { logger } from './logger';
import { AddressConfig } from './config';
import { RateLimiter } from './rateLimiter';

axiosRetry(axios, { retryDelay: exponentialDelay });

export class AddressTransaction {
    tx: factom.Transaction;
    addr: AddressConfig;

    price?: number;
    currency?: string;
    private _received?: number;

    constructor(tx: Transaction, addr: AddressConfig) {
        this.tx = tx;
        this.addr = addr;
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

    get received() {
        if (this._received != undefined) {
            return this._received;
        }
        // prettier-ignore
        let r = this.tx.factoidOutputs
                .filter((io) => io.address === this.addr.address)
                .reduce((total, current) => (total += current.amount), 0) * Math.pow(10, -8);
        this._received = r;
        return r;
    }

    // isRelevant determines whether or not this transaction meets the criteria set by the address config
    isRelevant() {
        if (this.received == 0) {
            return false;
        }

        const { coinbase, nonCoinbase } = this.addr;

        // Address may only record coinbase or non-coinbsae tranactions.
        const isCoinbase = this.tx.totalInputs === 0;
        return (isCoinbase && coinbase) || (!isCoinbase && nonCoinbase);
    }

    async populatePrice(currency: string, secret: string) {
        if (this.price != undefined && this.currency != undefined) {
            return;
        }
        this.currency = currency;

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
    }

    submitToBT(bitcoinTaxSecret: string, bitcoinTaxKey: string) {
        const body = {
            date: this.date,
            action: 'INCOME',
            symbol: 'FCT',
            currency: this.currency,
            volume: to8DecimalPlaces(this.received),
            price: this.price!,
            memo: this.tx.id,
            txhash: this.tx.id,
            recipient: this.addr.address,
        };
        const headers = { 'X-APIKEY': bitcoinTaxKey, 'X-APISECRET': bitcoinTaxSecret };

        const limiter = RateLimiter.getInstance();

        return limiter.scheduleBitcoinTax(() =>
            axios.post('https://api.bitcoin.tax/v1/transactions', body, {
                headers,
            })
        );
    }

    log() {
        logger.info(`\x1b[33mFound new transaction to ${this.addr.name}\x1b[0m`);
        logger.info(`Transaction ID:    ${this.tx.id}`);
        logger.info(`Date:              ${this.date}`);
        logger.info(`Height:            ${this.height}`);
        logger.info(`Address:           ${this.addr.address}`);
        logger.info(`Amount:            ${to8DecimalPlaces(this.received)}`);
        logger.info(`Price:             ${this.price}`);
    }
}
