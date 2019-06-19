import { DAO } from './db/DAO';

export interface TransactionRow {
    date: string;
    action: string;
    recipient: string;
    txhash: string;
    volume: number;
    symbol: string;
    price: number;
    total: number;
    currency: string;
    height: number;
}

export abstract class Repository {
    constructor(protected dao: DAO) {}

    abstract createTable(): Promise<unknown>;

    abstract create(row: any): Promise<unknown>;
}
