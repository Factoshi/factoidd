import { DAO } from './DAO';
import { TransactionRow, Repository } from '../types';

export class TransactionRepository extends Repository {
    constructor(dao: DAO) {
        super(dao);
    }

    createTable() {
        const sql = `
        CREATE TABLE IF NOT EXISTS transactions (
            date TEXT,
            action TEXT,
            recipient TEXT,
            txhash TEXT,
            volume INT,
            symbol TEXT,
            price REAL,
            total REAL,
            currency TXT,
            height INT
        )`;
        return this.dao.run(sql);
    }

    create(tx: TransactionRow) {
        const sql = `
        INSERT INTO transactions ( 
            date, 
            action, 
            recipient, 
            txhash, 
            volume, 
            symbol, 
            price, 
            total, 
            currency,
            height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.dao.run(sql, [
            tx.date,
            tx.action,
            tx.recipient,
            tx.txhash,
            tx.volume,
            tx.symbol,
            tx.price,
            tx.total,
            tx.currency,
            tx.height
        ]);
    }

    getHighestSavedHeight() {
        const sql = `SELECT height FROM transactions ORDER BY height DESC`;
        return this.dao.get<{ height: number } | undefined>(sql);
    }
}
