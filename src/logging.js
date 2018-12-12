const { createLogger, format, transports } = require('winston')

// Make a console logger to start
const consoleTransport = new transports.Console({
  format: format.cli(),
  handleExceptions: true
})

const log = createLogger({
  transports: [ consoleTransport ],
})

// Winston doesn't currently support unhandled rejections, so...
process.on('unhandledRejection', (err) => {
  log.error('Unhandled promise rejection', err)
})

const initLogging = ({papertrail, stackdriver}) => {
  if (papertrail.enabled) {
    // Loads transport into winston.transports
    require('winston-papertrail').Papertrail

    const papertrailTransport = new transports.Papertrail({
      handleExceptions: true,
      host: papertrail.host,
      inlineMeta: true,
      port: papertrail.port,
      program: 'factoid-address-monitord',
    })

    papertrailTransport.on('error', err => log && log.error(err))
    papertrailTransport.on('connect', message => log && log.info(message))

    log.add(papertrailTransport)
  }

  if (stackdriver.enabled) {
    const { LoggingWinston } = require('@google-cloud/logging-winston')
    const stackdriverTransport = new LoggingWinston({
      handleExceptions: true
    })
    log.add(stackdriverTransport)
  }

  log.info('Logging initialized')
}

module.exports = {log, initLogging}
