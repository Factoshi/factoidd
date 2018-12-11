const Joi = require('joi');
const { BaseError } = require('make-error-cause')

class ConfigurationError extends BaseError {
  constructor (message, cause) {
    super(message, cause)
  }
}

const configSchema = Joi.object({
  factomdConfig: Joi.object({
    host: Joi.string().hostname().default('localhost'),
    port: Joi.number().port().default(8088),
  }),
  addresses: Joi.array().min(1).items(Joi.object({
    address: Joi.string().regex(/^FA[A-Za-z0-9]{50}$/).required(),
    bitcoinTaxKey: Joi.string().alphanum().allow(''),
    bitcoinTaxSecret: Joi.string().alphanum().allow(''),
    currency: Joi.string().required(),
    nickname: Joi.string().required(),
    recordCoinbaseReceipts: Joi.boolean().default(true),
    recordNonCoinbaseReceipts: Joi.boolean().default(false),
    saveToBitcoinTax: Joi.boolean().default(false),
    saveToCsv: Joi.boolean().default(true),
  }))
})

let config = null

const validateConfig = () => {
  try {
    config = require('../conf/config.json')
  } catch (err) {
    throw new ConfigurationError('config.json file not found!', err)
  }

  const validationResult = Joi.validate(config, configSchema)

  if (validationResult.error) {
    config = null
    throw new ConfigurationError('config.json did not pass validation', validationResult.error)
  }
}

const getConfig = () => {
  if (!config) {
    throw new ConfigurationError('config.json has not been validated!')
  }

  return config
}

module.exports = {validateConfig, getConfig}
