const fs = require('fs');

function initStopBlocks() {
    const stopBlockExists = fs.existsSync('./stopBlocks.json');

    if (!stopBlockExists) {
        console.log('This first scan can take a while...');
        fs.writeFileSync('./stopBlocks.json', '{}');
    }
}

function validateConfig() {
    try {
        const config = require('../config.json');
        const asJSON = JSON.stringify(config);
        JSON.parse(asJSON);
    } catch (err) {
        throw new Error('Config file is not valid JSON');
    }
}

initStopBlocks();
validateConfig();
