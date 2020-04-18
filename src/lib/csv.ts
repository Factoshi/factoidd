import { TransactionTable } from './db';
import { logger } from './logger';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { to2DecimalPlaces, to6DecimalPlaces } from './utils';

export enum CSVSubDir {
    INCOME = 'income',
    SPEND = 'spend',
}

export function createCSVFile(appdir: string, address: string, subdirType: CSVSubDir) {
    const csvdir = resolve(appdir, 'csv');
    if (!existsSync(csvdir)) {
        mkdirSync(csvdir);
    }

    const subdir = resolve(csvdir, subdirType);
    if (!existsSync(subdir)) {
        mkdirSync(subdir);
    }

    const csvFile = resolve(subdir, `${address}.csv`);
    if (!existsSync(csvFile)) {
        logger.debug(`Creating CSV file: ${csvFile}`);
        appendFileSync(csvFile, 'date,height,txhash,volume,price,total,currency\n');
    }
}

interface CSVLine {
    date: string;
    height: number;
    txhash: string;
    volume: number;
    price: number;
    currency: string;
}

export function updateCSV(
    address: string,
    appDirectory: string,
    { date, height, txhash, volume, price, currency }: CSVLine,
    subdir: CSVSubDir
) {
    const csvFile = resolve(appDirectory, 'csv', subdir, `${address}.csv`);
    const total = to2DecimalPlaces(price * volume);
    volume = to6DecimalPlaces(volume);
    appendFileSync(
        csvFile,
        [date, height, txhash, volume, price, total, currency].join(',') + '\n'
    );
}

export async function batchUpdateCSV(db: TransactionTable, appDirectory: string) {
    const transactions = await db.getTransactionsNotWrittenToCSV();
    if (transactions.length === 0) {
        return;
    }

    logger.info(`Appending ${transactions.length} transaction(s) to CSV`);
    for (const tx of transactions) {
        const { address, receivedFCT, rowid, price, ...rest } = tx;
        updateCSV(
            address,
            appDirectory,
            { volume: receivedFCT, price: price!, ...rest },
            CSVSubDir.INCOME
        );
        await db.updateCSV(rowid, true).catch((e) => {
            // Failure to write to database after write to CSV is a fatal
            // error that cannot be recovered and requires user intervention. This is because there is
            // now an inconsistency between the CSV and the local database that will not be recovered
            // on restart.
            logger.error('Fatal error');
            logger.error(`Remove transaction ${tx.txhash} from csv before restarting`, e);
            process.exit(1);
        });
    }
}
