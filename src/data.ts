import { promises as fsp } from 'fs';
import { resolve } from 'path';

import axios from 'axios';

import { to2DecimalPlaces, to8DecimalPlaces } from './utils';
import { Transaction } from './transaction';
import { AddressConfig, Config } from './config';
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

export function appendToCSV(tx: Transaction, addr: AddressConfig) {
    const received = tx.received(addr);
    const csvStr =
        [
            tx.date,
            tx.height,
            addr.address,
            tx.tx.id,
            to8DecimalPlaces(received),
            tx.price,
            to2DecimalPlaces(tx.price! * received),
            tx.currency,
        ].join(',') + '\n';

    const csvFile = resolve(DATA_DIR, 'income', `${addr.name}.csv`);
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

export async function writeToBitcoinTax(conf: Config, tx: Transaction, addr: AddressConfig) {
    if (!conf.keys.bitcoinTax) {
        return;
    }

    const body = {
        date: tx.date,
        action: 'INCOME',
        symbol: 'FCT',
        currency: tx.currency,
        volume: to8DecimalPlaces(tx.received(addr)),
        price: tx.price!,
        memo: tx.tx.id,
        txhash: tx.tx.id,
        recipient: addr.address,
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
