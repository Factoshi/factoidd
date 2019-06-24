import { resolve } from 'path';
import { Heights } from './types';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { cli, factomEvent } from './init';
import { asyncCompose, info } from './utils';
import { config } from './init';
import Bottleneck from 'bottleneck';

const HEIGHT_PATH = resolve(__dirname, '../database/height.json');

export const createHeightJson = (path: string = HEIGHT_PATH) => {
    const heightFileExists = existsSync(path);
    if (!heightFileExists) {
        const json = JSON.stringify({ startHeight: config.options.startHeight });
        writeFileSync(path, json);
    }
};

export const getStartHeight = (path: string = HEIGHT_PATH): Heights =>
    JSON.parse(readFileSync(path, 'utf8'));

export const getStopHeight = async (heights: Heights) => {
    const { directoryBlockHeight } = await cli.getHeights();
    return { ...heights, stopHeight: directoryBlockHeight };
};

export const logScanStart = ({ startHeight, stopHeight }: Heights) => {
    info(`Scanning for new transactions between ${startHeight} and ${stopHeight}`);
    return { startHeight, stopHeight };
};

export const scanBlockchain = async (heights: Heights) => {
    const limiter = new Bottleneck({ minTime: config.options.minTime });
    for (let i = heights.startHeight; i <= heights.stopHeight!; i++) {
        if (i % 100 === 0) {
            info('Scanning block height', i);
        }
        // Ensue diretory blocks are fetched roughly in sync with the rate limited other API
        // methods. This is born of paranoia of race conditions and memory limits, but does not address
        // any known bug at the time of writing.
        const directoryBlock = await limiter.schedule(() => cli.getDirectoryBlock(i));
        // Force the event emitter to treat an old directory block as if it were new.
        // The address listener can thus handle both new and historical transactions.
        factomEvent.forceNewDirectoryBlock(directoryBlock);
    }
    info(`Scan complete`);
};

export const fetchHistoricalTransactions = asyncCompose(
    createHeightJson,
    getStartHeight,
    getStopHeight,
    logScanStart,
    scanBlockchain
);

export const saveHeight = (startHeight: number, path: string = HEIGHT_PATH) => {
    const savedHeight = JSON.parse(readFileSync(path, 'utf8')) as Heights;
    if (savedHeight.startHeight < startHeight) {
        // Save one block in the future to avoid rescanning block on start.
        writeFileSync(path, JSON.stringify({ startHeight }));
    }
};
