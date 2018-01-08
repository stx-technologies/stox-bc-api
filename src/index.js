// eslint-disable-next-line import/no-unresolved
require('app-module-path').addPath(__dirname)

const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const expressStatusMonitor = require('express-status-monitor')
const {
  loggers: {logger, expressLogger},
  expressHelpers: {errorHandler},
} = require('@welldone-software/node-toolbelt')
const apiRouter = require('app/apiRouter')
const {port} = require('app/config')

const app = express()

app.use(compression())
app.use(bodyParser.json())
app.use(expressLogger())
app.set('trust proxy', 'loopback')
app.disable('x-powered-by')

app.use('/api/v1', apiRouter)
app.use(expressStatusMonitor())

app.use(errorHandler)

const server = app.listen(port, () =>
  logger.info({binding: server.address()}, 'Server started'))
