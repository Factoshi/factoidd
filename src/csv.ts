import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve } from 'path';

import { logger } from './logger';
import { to2DecimalPlaces, to8DecimalPlaces } from './utils';
import { AddressTransaction } from './transaction';
import { DATA_DIR } from './constants';

export function createCSVFile(addressName: string) {
    const csvdir = resolve(DATA_DIR, 'csv');

    if (!existsSync(csvdir)) {
        mkdirSync(csvdir, { recursive: true });
    }

    const csvFile = resolve(csvdir, `${addressName}.csv`);
    if (!existsSync(csvFile)) {
        logger.debug(`Creating CSV file: ${csvFile}`);
        appendFileSync(csvFile, 'date,height,address,txhash,volume,price,total,currency\n');
    }
}

export function appendToCSV(data: AddressTransaction) {
    const csvStr =
        [
            data.date,
            data.height,
            data.addr.address,
            data.tx.id,
            to8DecimalPlaces(data.received),
            data.price,
            to2DecimalPlaces(data.price! * data.received),
            data.currency,
        ].join(',') + '\n';

    const csvFile = resolve(DATA_DIR, 'csv', `${data.addr.name}.csv`);
    appendFileSync(csvFile, csvStr);
}
