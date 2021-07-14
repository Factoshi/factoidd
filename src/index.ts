import { FactomCli } from 'factom';
import winston from 'winston';

import { logger } from './logger';
import { createCSVDir, createCSVFile, readSyncHeight } from './data';
import { Config } from './config';
import { SigIntListener } from './utils';
import { listenForNewBlocks, scanBlockchain } from './sync';

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

    // Scan blockchain for new transactions.
    logger.info('Scanning blockchain for new transactions');

    // Scans inside a loop until we are entirely caught up with the tip of the chain
    for (;;) {
        const { directoryBlockHeight } = await cli.getHeights();
        const savedHeight = await readSyncHeight();
        if (directoryBlockHeight === savedHeight) {
            break;
        }
        await scanBlockchain(conf, cli, directoryBlockHeight);
    }

    logger.info(`Scan complete. Listening for new blocks`);

    listenForNewBlocks(cli, conf);
}
