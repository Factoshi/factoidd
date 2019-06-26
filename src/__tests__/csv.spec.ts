import {
    resolveDirPATH,
    removeUnwantedFields,
    writeCsvRow,
    resolveCSVFile,
    createFile
} from '../csv';
import { resolve } from 'path';
import { TransactionRow } from '../types';
import { generateRandomFctAddress } from 'factom';
import { randomBytes } from 'crypto';
import { mocked } from 'ts-jest/utils';
import { existsSync, appendFileSync, mkdirSync } from 'fs';

jest.mock('fs');

const txRow: TransactionRow = {
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
Object.freeze(txRow);

test('should resolve the directory path', () => {
    const path = resolveDirPATH('income');
    expect(path).toBe(resolve(__dirname, '../../database/income'));
});

test('should resolve the CSV file path', () => {
    const result = resolve(
        __dirname,
        '../../database/income/' + txRow.recipient + '.csv'
    );
    const path = resolveDirPATH('income');
    const csvFilePath = resolveCSVFile(path, txRow);
    expect(csvFilePath).toBe(result);
});

test('should remove memo and timestamp fields', () => {
    const rowWithoutFields = removeUnwantedFields(txRow);
    const { memo, timestamp, ...rest } = txRow;
    expect(rowWithoutFields).toEqual({ ...rest });
});

test('should create an incoming directory and csv', () => {
    mocked(existsSync).mockReturnValue(false);
    const dirPath = resolve(__dirname, '../../database/income');
    const csvFile = resolve(
        __dirname,
        '../../database/income/',
        txRow.recipient + '.csv'
    );
    const row = createFile(txRow);
    expect(row).toEqual(txRow);
    expect(existsSync).toHaveBeenNthCalledWith(1, dirPath);
    expect(existsSync).toHaveBeenNthCalledWith(2, csvFile);
    expect(mkdirSync).toHaveBeenCalledWith(dirPath);
    expect(appendFileSync).toHaveBeenCalledWith(
        csvFile,
        Object.keys(txRow).join(',') + '\n'
    );
});

test('should create an incoming csv but not directory', () => {
    mocked(existsSync).mockReturnValueOnce(true);
    mocked(existsSync).mockReturnValueOnce(false);
    const dirPath = resolve(__dirname, '../../database/income');
    const csvFile = resolve(
        __dirname,
        '../../database/income/',
        txRow.recipient + '.csv'
    );
    const row = createFile(txRow);
    expect(row).toEqual(txRow);
    expect(existsSync).toHaveBeenNthCalledWith(1, dirPath);
    expect(existsSync).toHaveBeenNthCalledWith(2, csvFile);
    expect(mkdirSync).not.toHaveBeenCalledWith(dirPath);
    expect(appendFileSync).toHaveBeenCalledWith(
        csvFile,
        Object.keys(txRow).join(',') + '\n'
    );
});

test('should write to the csv file', () => {
    const csvFile = resolve(
        __dirname,
        '../../database/income/',
        txRow.recipient + '.csv'
    );
    const csvRow = Object.values(txRow).join(',') + '\n';
    writeCsvRow(txRow);
    expect(appendFileSync).toHaveBeenCalledWith(csvFile, csvRow);
});
