const {assignWith} = require('lodash')

const assignWithCustomizer = (objValue, srcValue) =>
  (objValue === undefined ? srcValue : objValue)

const errSerializer = err =>
  assignWith(
    {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
    },
    err,
    assignWithCustomizer
  )

module.exports = errSerializer
