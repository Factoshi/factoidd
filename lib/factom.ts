import { FactomEventEmitter, FactomCli, DirectoryBlock } from 'factom';
import { Config } from './config';

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

class Factom {
    public cli: FactomCli;
    public event: CustomFactomEventEmitter;

    constructor() {
        this.cli = new FactomCli(Config.factomd);
        this.event = new CustomFactomEventEmitter(this.cli);
    }
}

export const factom = new Factom();
