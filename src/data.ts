import { promises as fsp } from 'fs';
import { resolve } from 'path';

import axios from 'axios';

import { to2DecimalPlaces, to8DecimalPlaces } from './utils';
import { AddressTransaction } from './transaction';
import { Config } from './config';
import { RateLimiter } from './rateLimiter';
import { logger } from './logger';

const DATA_DIR = process.env.FACTOIDD_DATA_DIR || resolve(__dirname, '..', 'data');

export async function createCSVDir() {
    try {
        const csvdir = resolve(DATA_DIR, 'income');
        logger.info(`Creating income CSV directory: ${csvdir}`);
        await fsp.mkdir(csvdir);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
}

export async function createCSVFile(addressName: string) {
    try {
        const csvFile = resolve(DATA_DIR, 'income', `${addressName}.csv`);
        await fsp.appendFile(csvFile, 'date,height,address,txhash,volume,price,total,currency\n', {
            flag: 'ax', // Flag throws if file already exists.
        });
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
}

export function appendToCSV(data: AddressTransaction) {
    const csvStr =
        [
            data.date,
            data.height,
            data.addr.address,
            data.tx.id,
            to8DecimalPlaces(data.received),
            data.price,
            to2DecimalPlaces(data.price! * data.received),
            data.currency,
        ].join(',') + '\n';

    const csvFile = resolve(DATA_DIR, 'income', `${data.addr.name}.csv`);
    return fsp.appendFile(csvFile, csvStr);
}

export async function setSyncHeight(height: number) {
    try {
        const path = resolve(DATA_DIR, 'height.json');
        const heightJson = JSON.stringify({ height });
        await fsp.writeFile(path, heightJson);
    } catch (err) {
        logger.error(`failed to set height.json to ${height}:`, err);
        process.exit(1);
    }
}

export async function getSyncHeight() {
    try {
        const path = resolve(DATA_DIR, 'height.json');
        const json = await fsp.readFile(path);
        const h: { height: number } = JSON.parse(json.toString());
        return h.height;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return 0;
        }
        throw err;
    }
}

export async function writeToBitcoinTax(conf: Config, data: AddressTransaction) {
    if (!conf.keys.bitcoinTax) {
        return;
    }

    const body = {
        date: data.date,
        action: 'INCOME',
        symbol: 'FCT',
        currency: data.currency,
        volume: to8DecimalPlaces(data.received),
        price: data.price!,
        memo: data.tx.id,
        txhash: data.tx.id,
        recipient: data.addr.address,
    };
    const headers = { 'X-APIKEY': conf.keys.bitcoinTaxKey, 'X-APISECRET': conf.keys.bitcoinTaxSecret };

    const limiter = RateLimiter.getInstance();

    return limiter.scheduleBitcoinTax(async () => {
        const r = await axios.post('https://api.bitcoin.tax/v1/transactions', body, {
            headers,
        });
        if (r.data?.status !== 'success') {
            throw new Error(`bad bitcoin.tax response: ${JSON.stringify(r.data)}`);
        }
        return r;
    });
}
