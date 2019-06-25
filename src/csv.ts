import { existsSync, appendFileSync } from 'fs';
import { TransactionRow } from './types';
import { resolve } from 'path';
import { compose, info } from './utils';

export const resolveCsvPath = (txRow: TransactionRow) => {
    return resolve(__dirname, '../database/', txRow.recipient + '.csv');
};

export const removeUnwantedFields = (txRow: TransactionRow): TransactionRow => {
    const { memo, timestamp, ...rest } = txRow;
    return { ...rest };
};

export const createCsvFile = (txRow: TransactionRow) => {
    const csvPath = resolveCsvPath(txRow);
    const csvFileExists = existsSync(csvPath);
    if (!csvFileExists) {
        info('Creating new CSV file:', csvPath);
        const csvHeader = Object.keys(txRow).join(',') + '\n';
        appendFileSync(csvPath, csvHeader);
    }
    return txRow;
};

export const writeCsvRow = (txRow: TransactionRow) => {
    const csvPath = resolveCsvPath(txRow);
    const csvRow = Object.values(txRow).join(',') + '\n';
    appendFileSync(csvPath, csvRow);
};

export const appendRowToCsv = compose(
    removeUnwantedFields,
    createCsvFile,
    writeCsvRow
);
