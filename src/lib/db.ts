import sqlite from 'sqlite';
import { logger } from './logger';
import { TransactionRow } from './types';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

/**
 * Create an open sqlite3 database connection.
 * @param path Path to Sqlite database.
 */
export async function initialiseDatabase(dbPath: string) {
    try {
        logger.info(`Opening database connection to ${dbPath}`);
        return open({ filename: dbPath, driver: sqlite3.Database });
    } catch (e) {
        logger.error('Could not connect to database: ', e);
        process.exit(1);
    }
}

export class TransactionTable {
    constructor(private db: sqlite.Database) {}

    public createTransactionTable() {
        logger.debug(`Creating transaction table if it does not exist`);

        return this.db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                txhash      TEXT,
                address     TEXT,
                date        TEXT,
                timestamp   INTEGER,
                receivedFCT REAL,
                currency    TEXT,
                height      INTEGER,
                price       REAL,
                csv         BOOLEAN DEFAULT false,
                bitcointax  BOOLEAN DEFAULT false,
                PRIMARY KEY (txhash, address, currency)
        );`);
    }

    /**
     * Saves a transaction without price data.
     * @param tx Transaction row.
     */
    public insertUncommittedTransaction(tx: TransactionRow) {
        const values = {
            ':txhash': tx.txhash,
            ':address': tx.address,
            ':date': tx.date,
            ':timestamp': tx.timestamp,
            ':receivedFCT': tx.receivedFCT,
            ':currency': tx.currency,
            ':height': tx.height,
        };

        return this.db.run(
            `INSERT INTO transactions 
                (txhash, address, date, timestamp, receivedFCT, currency, height) 
            VALUES 
                (:txhash, :address, :date, :timestamp, :receivedFCT, :currency, :height);`,
            values
        );
    }

    public getTransactionsWithNullPrice(): Promise<
        { rowid: number; currency: string; timestamp: number; txhash: string }[]
    > {
        return this.db.all(`
            SELECT 
                rowid, 
                currency, 
                timestamp, 
                txhash
            FROM 
                transactions
            WHERE
                price IS NULL
        `);
    }

    public updatePrice(rowid: number, price: number) {
        return this.db.run('UPDATE transactions SET price = ? WHERE rowid = ?', price, rowid);
    }

    public getUncommittedTransactions(): Promise<(TransactionRow & { rowid: number })[]> {
        return this.db.all(`
            SELECT 
                *,
                rowid
            FROM 
                transactions
            WHERE
                bitcointax = false
            AND
                price > 0
        `);
    }

    public getTransactionsNotWrittenToCSV(): Promise<(TransactionRow & { rowid: number })[]> {
        return this.db.all(`
            SELECT 
                *,
                rowid
            FROM 
                transactions
            WHERE
                csv = false
            AND
                price > 0
        `);
    }

    public updateCSV(rowid: number, bool: boolean) {
        return this.db.run('UPDATE transactions SET csv = ? WHERE rowid = ?;', bool, rowid);
    }

    public updateBitcoinTax(rowid: number, bool: boolean) {
        return this.db.run('UPDATE transactions SET bitcointax = ? WHERE rowid = ?;', bool, rowid);
    }

    public async getMaxHeight(): Promise<number> {
        const max = await this.db.get('SELECT MAX(height) FROM transactions;');
        return max['MAX(height)'] || -1;
    }
}
