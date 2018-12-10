const { validateConfig } = require('./configuration')
const fs = require('fs');

function initStopBlocks() {
    const stopBlockExists = fs.existsSync('./db/stopBlocks.json');
    console.log('Waiting for new transactions.');

    if (!stopBlockExists) {
        console.log('This first scan can take a while...');
        fs.writeFileSync('./db/stopBlocks.json', '{}');
    }
}

initStopBlocks();
validateConfig();
