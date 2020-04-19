import { TransactionTable } from './db';
import { logger } from './logger';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { to2DecimalPlaces, to6DecimalPlaces, QuitListener } from './utils';

export enum CSVSubDir {
    INCOME = 'income',
    SPEND = 'spend',
}

interface CSVData {
    name: string;
    date: string;
    height: number;
    txhash: string;
    address: string;
    volume: number;
    price: number;
    currency: string;
}

function resolveCSVPath(appdir: string, subdir: CSVSubDir) {
    return resolve(appdir, 'csv', subdir);
}

export function createCSVFile(appdir: string, subdir: CSVSubDir, name: string) {
    const csvdir = resolveCSVPath(appdir, subdir);

    if (!existsSync(csvdir)) {
        mkdirSync(csvdir, { recursive: true });
    }

    const csvFile = resolve(csvdir, `${name}.csv`);
    if (!existsSync(csvFile)) {
        logger.debug(`Creating CSV file: ${csvFile}`);
        appendFileSync(csvFile, 'date,height,address,txhash,volume,price,total,currency\n');
    }
}

export function updateCSV(appdir: string, subdir: CSVSubDir, csvData: CSVData) {
    const { date, height, txhash, volume, price, currency, address, name } = csvData;
    // prettier-ignore
    const csvStr = [
        date, 
        height, 
        address, 
        txhash, 
        to6DecimalPlaces(volume), // volume
        price, 
        to2DecimalPlaces(price * volume), // total
        currency
    ].join(',') + '\n';

    const csvFile = resolve(resolveCSVPath(appdir, subdir), `${name}.csv`);
    appendFileSync(csvFile, csvStr);
}

export async function batchUpdateCSV(db: TransactionTable, appdir: string, ql: QuitListener) {
    const transactions = await db.getTransactionsNotWrittenToCSV();
    if (transactions.length === 0) {
        return;
    }
    logger.info(`Appending ${transactions.length} transaction(s) to CSV`);

    for (const { rowid, receivedFCT: volume, price, ...rest } of transactions) {
        // Prevent quit until CSV updated and recorded in database
        ql.setCanQuit('csv', false);

        updateCSV(appdir, CSVSubDir.INCOME, { volume, price: price!, ...rest });
        await db.updateCSV(rowid, true).catch((e) => {
            /**
             * Failure to write to database after write to CSV is a fatal error that cannot be recovered
             * and requires user intervention. This is because there is now an inconsistency between the CSV
             * and the local database that will not be recovered on restart.
             */
            logger.error('Fatal error');
            logger.error(`Remove transaction ${rest.txhash} from csv before restarting`, e);
            process.exit(1);
        });

        // Allow quit following transactions
        ql.setCanQuit('csv', true);
    }
    logger.info('Done!');
}
