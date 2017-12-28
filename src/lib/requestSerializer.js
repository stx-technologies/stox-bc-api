const {stdSerializers} = require('pino')

const requestSerializer = req => ({
  ...stdSerializers.req(req),
  body: req.body,
})

module.exports = requestSerializer
