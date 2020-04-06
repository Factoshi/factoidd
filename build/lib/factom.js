"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const factom_1 = require("factom");
const logger_1 = require("./logger");
class CustomFactomEventEmitter extends factom_1.FactomEventEmitter {
    /**
     * Method adds the ability to emit data for old heights. Useful for feeding old blocks into same
     * pipeline as new blocks.
     * @param block Directory block to be emitted.
     */
    handleDirectoryBlock(block) {
        // @ts-ignore
        super._handleDirectoryBlock(block);
    }
}
class Factom {
    constructor(config) {
        this.cli = new factom_1.FactomCli(config);
        this.event = new CustomFactomEventEmitter(this.cli);
    }
    /**
     * Ensures factomd connection parameters are valid. Exits if contact cannot be made.
     */
    async testConnection() {
        try {
            logger_1.logger.info('Testing factomd connection');
            await this.cli.getHeights();
        }
        catch (e) {
            logger_1.logger.error('Could not contact factomd: ', e);
            process.exit(1);
        }
    }
}
exports.Factom = Factom;
