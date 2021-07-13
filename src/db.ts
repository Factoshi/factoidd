import { resolve } from 'path';

import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

import { DATA_DIR } from './constants';
import { logger } from './logger';
import { AddressTransaction } from './transaction';

export async function initDB() {
    const dbPath = resolve(DATA_DIR, 'factoidd.db');
    logger.info(`Opening database connection to ${dbPath}`);
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    await createTransactionTable(db);
    return db;
}

export function createTransactionTable(db: Database) {
    logger.debug(`Creating transaction table if it does not exist`);

    return db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            txhash      TEXT,
            address     TEXT,
            name        TEXT,
            date        TEXT,
            timestamp   INTEGER,
            receivedFCT REAL,
            currency    TEXT,
            height      INTEGER,
            price       REAL,
            PRIMARY KEY (txhash, address, currency)
    );`);
}

export async function saveTransaction(db: Database, at: AddressTransaction) {
    const values = {
        ':txhash': at.tx.id,
        ':address': at.addr.address,
        ':name': at.addr.name,
        ':date': at.date,
        ':timestamp': at.timestamp,
        ':receivedFCT': at.received,
        ':currency': at.currency,
        ':height': at.height,
        ':price': at.price,
    };

    return db.run(
        `INSERT INTO transactions 
            (txhash, address, name, date, timestamp, receivedFCT, currency, height, price) 
        VALUES 
            (:txhash, :address, :name, :date, :timestamp, :receivedFCT, :currency, :height, :price);`,
        values
    );
}
