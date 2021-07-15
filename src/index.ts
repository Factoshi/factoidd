import { FactomCli } from 'factom';
import winston from 'winston';

import { logger } from './logger';
import { createCSVDir, createCSVFile, getSyncHeight, setSyncHeight } from './data';
import { Config } from './config';
import { SigIntListener } from './utils';
import { syncTransactions } from './sync';

export async function main() {
    SigIntListener.init();

    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: process.env.FACTOIDD_LOG_LVL || 'info',
        stderrLevels: ['error'],
    });
    logger.add(consoleTransport);

    const conf = new Config();
    const cli = new FactomCli(conf.factomd);

    // Create the CSV files to record transactions
    await createCSVDir();
    for (const { name } of conf.addresses) {
        await createCSVFile(name);
    }

    const syncHeight = await getSyncHeight();
    if (conf.options.startHeight > syncHeight) {
        await setSyncHeight(conf.options.startHeight);
    }

    await syncTransactions(conf, cli);
}
