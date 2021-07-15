import { FactomCli } from 'factom';

import { logger } from './logger';
import { AddressTransaction } from './transaction';
import { appendToCSV, getSyncHeight, setSyncHeight, writeToBitcoinTax } from './data';
import { Config } from './config';
import { SigIntListener } from './utils';

/**
 * Loops over past heights to fill in historical transaction data.
 */
export async function syncTransactions(conf: Config, cli: FactomCli) {
    logger.info('Syncing new transactions');

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
                await syncBlock(conf, cli, i);
                await setSyncHeight(i);
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

    for (const tx of block.transactions) {
        for (const a of conf.addresses) {
            const at = new AddressTransaction(tx, a);

            if (!at.isRelevant()) {
                continue;
            }

            const s = SigIntListener.getInstance();
            s.lock();

            try {
                // Cannot recover automatically if one of these fails. User intervention required.
                await at.populatePrice(conf.options.currency, conf.keys.cryptocompare);
                await Promise.all([writeToBitcoinTax(conf, at), appendToCSV(at)]);
            } catch (err) {
                logger.error(`failed to process tx ${at.tx.id} at height ${height}.`, err);
                logger.error(
                    `remove transactions for height ${height} from csv and bitcoin.tax before restarting`
                );
                process.exit(1);
            }

            at.log();
            s.unlock();
        }
    }
}
