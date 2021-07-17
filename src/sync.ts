import { FactomCli } from 'factom';

import { logger } from './logger';
import { Transaction } from './transaction';
import { appendToCSV, getSyncHeight, setSyncHeight, writeToBitcoinTax } from './data';
import { Config } from './config';
import { SigIntListener, to8DecimalPlaces } from './utils';

/**
 * Loops over past heights to fill in historical transaction data.
 */
export async function sync(conf: Config, cli: FactomCli) {
    logger.info('Syncing transactions');
    const s = SigIntListener.getInstance();

    for (;;) {
        try {
            const { directoryBlockHeight } = await cli.getHeights();
            const syncHeight = await getSyncHeight();

            if (directoryBlockHeight === syncHeight) {
                // Sleep for a minute
                await new Promise((resolve) => setTimeout(resolve, 60000));
                continue;
            }

            for (let i = syncHeight + 1; i <= directoryBlockHeight; i++) {
                if (i % 100 === 0) {
                    logger.info(`Syncing block height: ${i}`);
                }
                s.lock();
                await syncBlock(conf, cli, i);
                await setSyncHeight(i);
                s.unlock();
            }
        } catch (err) {
            logger.error('sync error:', err);
            await new Promise((resolve) => setTimeout(resolve, 60000));
            continue;
        }
    }
}

async function syncBlock(conf: Config, cli: FactomCli, height: number) {
    const block = await cli.getFactoidBlock(height);

    for (const transaction of block.transactions) {
        const tx = new Transaction(transaction);

        for (const addr of conf.addresses) {
            if (!tx.isRelevant(addr)) {
                continue;
            }

            try {
                // Cannot recover automatically if one of these fails. User intervention required.
                await tx.populatePrice(conf.options.currency, conf.keys.cryptocompare);
                await Promise.all([writeToBitcoinTax(conf, tx, addr), appendToCSV(tx, addr)]);
            } catch (err) {
                logger.error(`failed to process tx ${transaction.id} at height ${height}.`, err);
                logger.error(
                    `remove transactions for height ${height} from csv and bitcoin.tax before restarting`
                );
                process.exit(1);
            }

            logger.info(`\x1b[33mFound new transaction\x1b[0m`);
            logger.info(`Address:           ${addr.name}`);
            logger.info(`Transaction ID:    ${transaction.id}`);
            logger.info(`Date:              ${tx.date}`);
            logger.info(`Height:            ${tx.height}`);
            logger.info(`Amount:            ${to8DecimalPlaces(tx.received(addr))}`);
            logger.info(`Price:             ${tx.price}`);
        }
    }
}
