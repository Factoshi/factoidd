import { FactomEventEmitter, FactomCli } from 'factom';
import { createConfig } from './config';

const env = process.env.NODE_ENV;
const configFile =
    env !== 'test' ? '../config/config.yaml' : './__tests__/test.config.yaml';

export const config = createConfig(configFile);
export const cli = new FactomCli(config.factomd);
export const factomEvent = new FactomEventEmitter(cli);
