import { resolveCsvPath, removeUnwantedFields, createCsvFile, writeCsvRow } from '../csv';
import { resolve } from 'path';
import { TransactionRow } from '../types';
import { generateRandomFctAddress } from 'factom';
import { randomBytes } from 'crypto';
import { mocked } from 'ts-jest/utils';
import { existsSync, appendFileSync } from 'fs';

jest.mock('fs');

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

const PATH = resolve(__dirname, '../../database/', transactionRow.recipient + '.csv');

test('should resolve the CSV path', () => {
    const path = resolveCsvPath(transactionRow);
    expect(path).toBe(PATH);
});

test('should remove memo and timestamp fields', () => {
    const rowWithoutFields = removeUnwantedFields(transactionRow);
    const { memo, timestamp, ...rest } = transactionRow;
    expect(rowWithoutFields).toEqual({ ...rest });
});

test('should create the csv file', () => {
    mocked(existsSync).mockReturnValue(false);
    const csvHeader = Object.keys(transactionRow).join(',') + '\n';
    const txRow = createCsvFile(transactionRow);
    expect(existsSync).toHaveBeenCalledWith(PATH);
    expect(appendFileSync).toHaveBeenCalledWith(PATH, csvHeader);
    expect(txRow).toBe(transactionRow);
});

test('should write to the csv file', () => {
    const csvRow = Object.values(transactionRow).join(',') + '\n';
    writeCsvRow(transactionRow);
    expect(appendFileSync).toHaveBeenCalledWith(PATH, csvRow);
});
