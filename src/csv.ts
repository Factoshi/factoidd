import { existsSync, appendFileSync, mkdirSync } from 'fs';
import { TransactionRow } from './types';
import { resolve } from 'path';
import { compose, info } from './utils';

// May have an outgoing option in the future. This protects the user
// against breaking changes.
export const resolveDirPATH = (dirname: string) =>
    resolve(__dirname, '../database/' + dirname);

export const resolveCSVFile = (path: String, txRow: TransactionRow) =>
    path + '/' + txRow.recipient + '.csv';

export const removeUnwantedFields = (txRow: TransactionRow): TransactionRow => {
    const { memo, timestamp, ...rest } = txRow;
    return { ...rest };
};

export const createFile = (txRow: TransactionRow) => {
    const dir = txRow.action.toLocaleLowerCase();
    const dirPath = resolveDirPATH(dir);
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath);
    }
    const csvFile = resolveCSVFile(dirPath, txRow);
    if (!existsSync(csvFile)) {
        info('Creating new CSV file:', csvFile);
        const csvHeader = Object.keys(txRow).join(',') + '\n';
        appendFileSync(csvFile, csvHeader);
    }
    return txRow;
};

export const writeCsvRow = (txRow: TransactionRow) => {
    const dir = txRow.action.toLocaleLowerCase();
    const dirPath = resolveDirPATH(dir);
    const csvFile = resolveCSVFile(dirPath, txRow);
    const csvRow = Object.values(txRow).join(',') + '\n';
    appendFileSync(csvFile, csvRow);
};

export const appendRowToCsv = compose(
    removeUnwantedFields,
    createFile,
    writeCsvRow
);
