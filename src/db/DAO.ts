import sqlite3 from 'sqlite3';

type sqlMethod = (
    sql: string,
    params: any,
    cb?: (this: sqlite3.Statement, err: Error | null, res: any) => void
) => sqlite3.Database;

export class DAO {
    private db!: sqlite3.Database;

    constructor(private dbFilePath: string) {
        this.connect();
    }

    private createRequestHandler(method: sqlMethod) {
        return <T>(sql: string, params: Array<any> = []) => {
            return new Promise<T>((resolve, reject) => {
                method(sql, params, (err, result) => {
                    if (err) {
                        console.error('Error running sql: ' + sql);
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };
    }

    connect() {
        this.db = new sqlite3.Database(this.dbFilePath, err => {
            if (err) {
                throw err;
            }
        });
    }

    run(sql: string, params: Array<any> = []) {
        const db = this.db;
        const requestHandler = this.createRequestHandler(db.run.bind(db));
        return requestHandler(sql, params);
    }

    get<T>(sql: string, params: Array<any> = []) {
        const db = this.db;
        const requestHandler = this.createRequestHandler(db.get.bind(db));
        return requestHandler<T>(sql, params);
    }

    all<T>(sql: string, params: Array<any> = []) {
        const db = this.db;
        const requestHandler = this.createRequestHandler(db.all.bind(db));
        return requestHandler<Array<T>>(sql, params);
    }
}
