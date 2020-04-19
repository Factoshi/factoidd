import fs from 'fs';
import yaml from 'js-yaml';
import {
    createFactomdConfig,
    createAddressConfig,
    createKeyConfig,
    createOptionConfig,
    createAppdirIfNotExist,
    getConfigPath,
} from '../lib';

/**
 *
 * @param path
 */
export async function init(appdir: string) {
    try {
        // Build the config.
        const factomd = await createFactomdConfig();
        const addresses = await createAddressConfig();
        const keys = await createKeyConfig();
        const options = await createOptionConfig();
        const config = yaml.safeDump({ factomd, addresses, keys, options });
        console.log(`${config}`);

        createAppdirIfNotExist(appdir);
        const path = getConfigPath(appdir);

        // Write config to config file.
        console.log(`Writing config to ${path}`);
        fs.writeFileSync(path, config);

        console.log('Done!');
    } catch (e) {
        console.error('Could not complete factoidd initialisation');
        console.error(e);
    }
}
