import yaml from 'js-yaml';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createFactomdConfig, createAddressConfig, createOptionsConfig } from '../lib';

/**
 * Gets the absolute path to the app directory.
 */
function getAppdirPath() {
    const homedir = os.homedir();
    return path.join(homedir, '.factoidd');
}

/**
 * Gets the absolute path to the config file.
 */
export function getConfigPath(appdir?: string) {
    if (!appdir) {
        appdir = getAppdirPath();
    }
    return path.join(appdir, 'config.yaml');
}

/**
 * Gets the absolute path to the database file.
 */
export function getDatabasePath(appdir?: string) {
    if (!appdir) {
        appdir = getAppdirPath();
    }
    return path.join(appdir, 'factoidd.db');
}

/**
 * Writes config string to yaml file in app directory.
 * @param appdir Absolute path to app directory.
 * @param config Config as yaml string.
 */
function writeConfig({ appdir, config }: { appdir: string; config: string }) {
    const configPath = getConfigPath(appdir);
    console.log(`Writing config to ${configPath}`);
    fs.writeFileSync(configPath, config);
}

/**
 * Creates an app directory in the home directory if it does not already exist.
 * @returns Absolute path to app directory
 */
function createAppdirIfNotExist(): string {
    const appdir = getAppdirPath();
    const appdirExists = fs.existsSync(appdir);
    if (!appdirExists) {
        console.log(`Creating app directory at: ${appdir}`);
        fs.mkdirSync(appdir);
    }
    return appdir;
}

export async function init() {
    // Build the config.
    const factomd = await createFactomdConfig();
    const addresses = await createAddressConfig();
    const options = await createOptionsConfig();
    const config = yaml.safeDump({ factomd, addresses, options });
    console.log(`${config}`);

    // Create the app directory.
    const appdir = createAppdirIfNotExist();

    // Write config to config file.
    writeConfig({ appdir, config });

    console.log('Done!');
}
