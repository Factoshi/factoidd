const { getConfig } = require('./configuration')

const { factomdConfig } = getConfig()

const { FactomCli } = require('factom');
const cli = new FactomCli({
    host: factomdConfig.factomdHost,
    port: factomdConfig.factomdPort
});

module.exports = cli;
