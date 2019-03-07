const { getConfig } = require('./configuration')

const { factomdConfig } = getConfig()

const { FactomCli } = require('factom');

const cli = new FactomCli(factomdConfig);

module.exports = cli;
