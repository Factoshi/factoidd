import { TransactionTable } from './db';
import { logger } from './logger';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve } from 'path';

export function createIncomeCSVFile(appdir: string, address: string) {
    const csvDirectory = resolve(appdir, 'csv');
    if (!existsSync(csvDirectory)) {
        mkdirSync(csvDirectory);
    }

    const incomeDirectory = resolve(csvDirectory, 'income');
    if (!existsSync(incomeDirectory)) {
        mkdirSync(incomeDirectory);
    }

    const csvFile = resolve(incomeDirectory, `${address}.csv`);
    if (!existsSync(csvFile)) {
        logger.debug(`Creating CSV file: ${csvFile}`);
        appendFileSync(csvFile, 'date,height,txhash,receivedFCT,price,currency\n');
    }
}

export async function batchUpdateCSV(db: TransactionTable, appDirectory: string) {
    const transactions = await db.getTransactionsNotWrittenToCSV();
    if (transactions.length === 0) {
        return;
    }

    logger.info(`Appending ${transactions.length} transaction(s) to CSV`);
    for (const tx of transactions) {
        const { address, date, height, txhash, receivedFCT, price, currency, rowid } = tx;
        const csvFile = resolve(appDirectory, 'csv', 'income', `${address}.csv`);
        appendFileSync(
            csvFile,
            [date, height, txhash, receivedFCT, price, currency].join(',') + '\n'
        );
        await db.updateCSV(rowid, true).catch((e) => {
            // Failure to write to database after write to CSV is a fatal
            // error that cannot be recovered and requires user intervention. This is because there is
            // now an inconsistency between the CSV and the local database that will not be recovered
            // on restart.
            logger.error('Fatal error');
            logger.error(`Remove transaction ${tx.txhash} from ${csvFile} before restarting`);
            logger.error(e);
            process.exit(1);
        });
    }

    logger.info(`Appended ${transactions.length} to CSV`);
}
