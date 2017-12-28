// eslint-disable-next-line import/no-unresolved
require('app-module-path').addPath(__dirname)

const express = require('express')
const compression = require('compression')
const expressStatusMonitor = require('express-status-monitor')
const {logger, expressLogger} = require('lib/logger')
const {errorHandler} = require('lib/expressHelpers')
const apiRouter = require('app/apiRouter')
const {PORT} = require('app/config')

const app = express()

app.use(compression())
app.use(expressLogger)
app.set('trust proxy', 'loopback')
app.disable('x-powered-by')

app.use('/api/v1', apiRouter)
app.use(expressStatusMonitor())

app.use(errorHandler)

const server = app.listen(PORT, () =>
  logger.info({binding: server.address()}, 'Server started'))
