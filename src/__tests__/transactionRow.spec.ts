import { generateRandomFctAddress, Transaction } from 'factom';
import {
    filterAndSumOutputs,
    factoshisToFactoids,
    setInitialFields,
    addPriceInfo
} from '../transactionRow';
import { AddressConfig } from '../types';
import { fetchPrice } from '../priceApi';
import { mocked } from 'ts-jest/utils';

jest.mock('../priceApi');

const addressA = generateRandomFctAddress().public;
const addressB = generateRandomFctAddress().public;

const id = '1c9d789c751a6049a6d8b83def7d53804850da50d54f29bf449d9e957a5196f1';
const coinbaseTxMock = {
    totalInputs: 0, // 0 input value for coinbase transactions
    timestamp: 1555799085597,
    id,
    blockContext: { directoryBlockHeight: 10 },
    factoidOutputs: [
        { address: addressA, amount: 100000000 },
        { address: addressA, amount: 200000000 },
        { address: addressB, amount: 400000000 }
    ]
};

const nonCoinbaseTxMock = {
    totalInputs: 1,
    timestamp: 1555799085597,
    factoidOutputs: [
        { address: addressB, amount: 500000000 },
        { address: addressB, amount: 600000000 },
        { address: addressA, amount: 700000000 }
    ]
};

test('should filter and sum a coinbase transaction and return non zero number', () => {
    const config = { recordCoinbase: true, recordNonCoinbase: false, address: addressA };
    const params = { tx: coinbaseTxMock as Transaction, conf: config as AddressConfig };
    const ownOutputs = filterAndSumOutputs(params);
    expect(ownOutputs).toBe(300000000);
});

test('should filter and sum a coinbase transaction and return zero', () => {
    // Record non-coinbase, not coinbase.
    const config = { recordCoinbase: false, recordNonCoinbase: true, address: addressA };
    const params = { tx: coinbaseTxMock as Transaction, conf: config as AddressConfig };
    const ownOutputs = filterAndSumOutputs(params);
    expect(ownOutputs).toBe(0);
});

test('should filter and sum a non coinbase transaction and return non zero number', () => {
    const config = { recordCoinbase: false, recordNonCoinbase: true, address: addressB };
    const params = {
        tx: nonCoinbaseTxMock as Transaction,
        conf: config as AddressConfig
    };
    const ownOutputs = filterAndSumOutputs(params);
    expect(ownOutputs).toBe(1100000000);
});

test('should filter and sum a coinbase transaction and return zero', () => {
    // Record non-coinbase, not coinbase.
    const config = { recordCoinbase: true, recordNonCoinbase: false, address: addressB };
    const params = {
        tx: nonCoinbaseTxMock as Transaction,
        conf: config as AddressConfig
    };
    const ownOutputs = filterAndSumOutputs(params);
    expect(ownOutputs).toBe(0);
});

test('should convert factoshis to factoids', () => {
    const factoshis = 100000000;
    const factoids = factoshisToFactoids(factoshis);
    expect(factoids).toBe(1);
});

test('should set initial fields of transaction row', () => {
    const config = { address: addressA, currency: 'GBP', recordCoinbase: true };
    const initialRow = setInitialFields({
        tx: coinbaseTxMock as Transaction,
        conf: config as AddressConfig
    });
    expect(initialRow).toEqual({
        timestamp: 1555799086,
        date: '2019-04-20T22:24:45.597Z',
        action: 'INCOME',
        recipient: addressA,
        txhash: id,
        memo: id,
        height: 10,
        symbol: 'FCT',
        volume: 3,
        currency: 'GBP'
    });
});

test('should add price data to row', async () => {
    mocked(fetchPrice).mockReturnValue(Promise.resolve(10));
    const config = { address: addressA, currency: 'GBP', recordCoinbase: true };
    const initialRow = setInitialFields({
        tx: coinbaseTxMock as Transaction,
        conf: config as AddressConfig
    });
    const withPrice = await addPriceInfo(initialRow);
    expect(withPrice).toEqual({
        timestamp: 1555799086,
        date: '2019-04-20T22:24:45.597Z',
        action: 'INCOME',
        recipient: addressA,
        txhash: id,
        memo: id,
        height: 10,
        symbol: 'FCT',
        volume: 3,
        currency: 'GBP',
        total: 30,
        price: 10
    });
});
