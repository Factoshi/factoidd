import {
    removeUnwantedFields,
    getBitcoinTaxParams,
    getBitcoinTaxCall
} from '../bitcoin.tax';
import { randomBytes } from 'crypto';
import { generateRandomFctAddress } from 'factom';
import { TransactionRow, Config } from '../types';
import axios from 'axios';

jest.mock('axios');

const transactionRow: TransactionRow = {
    timestamp: 100,
    date: '2018-07-05',
    action: 'INCOME',
    recipient: generateRandomFctAddress().public,
    memo: randomBytes(32).toString('hex'),
    volume: 10,
    symbol: 'FCT',
    price: 10.2,
    total: 102,
    currency: 'EUR',
    txhash: randomBytes(32).toString('hex'),
    height: 100000
};
Object.freeze(transactionRow);

test('should remove height and timestamp fields', () => {
    const rowWithoutFields = removeUnwantedFields(transactionRow);
    const { height, timestamp, ...rest } = transactionRow;
    expect(rowWithoutFields).toEqual({ ...rest });
});

test('should get bitcoin.tax params with key and secret set', () => {
    const conf = {
        bitcoinTax: {
            key: randomBytes(8).toString('hex'),
            secret: randomBytes(16).toString('hex')
        }
    };
    const headers = {
        'X-APISECRET': conf.bitcoinTax.secret,
        'X-APIKEY': conf.bitcoinTax.key
    };
    const uri = 'https://api.bitcoin.tax/v1/transactions';
    const paramFn = getBitcoinTaxParams(conf as Config);
    expect(paramFn(transactionRow)).toEqual({ uri, txRow: transactionRow, headers });
});

test('should get bitcoin.tax params without key and secret set', () => {
    const conf = { bitcoinTax: {} };
    const paramFn = getBitcoinTaxParams(conf as Config);
    expect(paramFn(transactionRow)).toEqual({
        uri: undefined,
        txRow: transactionRow,
        headers: undefined
    });
});

test('should create bitcoin.tax method that should call axios', async () => {
    const conf = { options: { minTime: 5 } };
    const callBtFn = getBitcoinTaxCall(conf as Config);
    const uri = 'https://api.bitcoin.tax/v1/transactions';
    const headers = {
        'X-APISECRET': randomBytes(8).toString('hex'),
        'X-APIKEY': randomBytes(16).toString('hex')
    };
    await callBtFn({ uri, txRow: transactionRow, headers });
    expect(axios.post).toBeCalledWith(uri, transactionRow, { headers });
});

test('should craete bitcoin.tax method that should not call axios', async () => {
    const conf = { options: { minTime: 5 } };
    const callBtFn = getBitcoinTaxCall(conf as Config);
    const uri = undefined;
    const headers = undefined;
    await callBtFn({ uri, txRow: transactionRow, headers });
    expect(axios.post).not.toBeCalled();
});
