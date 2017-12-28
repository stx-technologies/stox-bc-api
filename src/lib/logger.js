const pino = require('pino')
const expressPino = require('express-pino-logger')
const errorSerializer = require('./errorSerializer')
const requestSerializer = require('./requestSerializer')

const serializers = {
  req: requestSerializer,
  err: errorSerializer,
  error: errorSerializer,
}

const logger = pino({serializers})
const expressLogger = expressPino({logger, serializers})

module.exports = {
  logger,
  expressLogger,
}
