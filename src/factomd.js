const { getConfig } = require('./configuration')

const { factomdConfig } = getConfig()

const { FactomCli } = require('factom');
const cli = new FactomCli({
    host: factomdConfig.host,
    port: factomdConfig.port
});

module.exports = cli;
