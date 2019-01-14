const { validateConfig } = require('./configuration');
const { initLogging, log } = require('./logging');

const fs = require('fs');

function initStopBlocks() {
    const stopBlockExists = fs.existsSync('./db/stopBlocks.json');
    log.info('Waiting for new transactions.');

    if (!stopBlockExists) {
        log.info('This first scan can take a while...');
        fs.writeFileSync('./db/stopBlocks.json', '{}');
    }
}

const config = validateConfig();
initLogging(config.logging);
initStopBlocks();
