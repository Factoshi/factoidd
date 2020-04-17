import fs from 'fs';
import yaml from 'js-yaml';
import {
    createFactomdConfig,
    createAddressConfig,
    createOptionsConfig,
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
        const options = await createOptionsConfig();
        const config = yaml.safeDump({ factomd, addresses, options });
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
