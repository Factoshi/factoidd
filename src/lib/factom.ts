import { FactomEventEmitter, FactomCli, DirectoryBlock } from 'factom';
import { FactomdConfig } from './types';
import { logger } from './logger';

class CustomFactomEventEmitter extends FactomEventEmitter {
    /**
     * Method adds the ability to emit data for old heights. Useful for feeding old blocks into same
     * pipeline as new blocks.
     * @param block Directory block to be emitted.
     */
    handleDirectoryBlock(block: DirectoryBlock) {
        // @ts-ignore
        super._handleDirectoryBlock(block);
    }
}

export class Factom {
    public cli: FactomCli;
    public event: CustomFactomEventEmitter;

    constructor(config: FactomdConfig) {
        this.cli = new FactomCli(config);
        this.event = new CustomFactomEventEmitter(this.cli);
    }

    /**
     * Ensures factomd connection parameters are valid. Exits if contact cannot be made.
     */
    public async testConnection() {
        try {
            logger.info('Testing factomd connection');
            await this.cli.getHeights();
        } catch (e) {
            logger.error('Could not contact factomd: ', e);
            process.exit(1);
        }
    }
}
