import { FactomCli, FactomEventEmitter, FactoidBlock } from 'factom';

import { logger } from './logger';
import { AddressTransaction } from './transaction';
import { appendToCSV, readSyncHeight, writeSyncHeight, writeToBitcoinTax } from './data';
import { Config } from './config';
import { SigIntListener } from './utils';

export function listenForNewBlocks(cli: FactomCli, conf: Config) {
    // Listens for new directory blocks by polling factomd
    const e = new FactomEventEmitter(cli);

    e.on('newFactoidBlock', async (fBlock: FactoidBlock) => {
        try {
            await handleNewBlock(conf, fBlock);
        } catch (err) {
            logger.error(`Error on processing new block`, err);
            process.exit(1);
        }
    });

    e.on('error', (err) => {
        logger.error('Factom event error:', err);
        process.exit(1);
    });
}

/**
 * Loops over past heights to fill in historical transaction data.
 */
export async function scanBlockchain(conf: Config, cli: FactomCli, to: number) {
    const h = await readSyncHeight();

    // If the config start height is ahead of the saved height, we'll use that instead.
    const startHeight = h >= conf.options.startHeight ? h + 1 : conf.options.startHeight;

    for (let i = startHeight; i <= to; i++) {
        if (i % 1000 === 0) logger.info(`Scanning block height: ${i}`);
        const fBlock = await cli.getFactoidBlock(i);
        await handleNewBlock(conf, fBlock);
    }
}

async function handleNewBlock(conf: Config, block: FactoidBlock) {
    const height = block.directoryBlockHeight;

    for (const tx of block.transactions) {
        for (const a of conf.addresses) {
            const at = new AddressTransaction(tx, a);

            if (!at.isRelevant()) {
                continue;
            }

            const s = SigIntListener.getInstance();
            s.lock();

            try {
                await at.populatePrice(conf.options.currency, conf.keys.cryptocompare);
                await Promise.all([writeToBitcoinTax(conf, at), appendToCSV(at)]);
            } catch (err) {
                logger.error(`failed to process tx ${at.tx.id} at height ${height}.`);
                logger.error(
                    `remove transactions for height ${height} from csv and bitcoin.tax before restarting`
                );
                console.log(err);
                process.exit(1);
            }

            at.log();
            s.unlock();
        }
    }

    return writeSyncHeight(height);
}
