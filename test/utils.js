const axios = require('axios')
const {port} = require('app/config')
const HttpError = require('standard-http-error')

const api = `${process.env.API_URL || 'http://localhost'}:${port}`
const apiVersion = process.env.API_VERSION || '/api/v1'

const expectHttpFailure = async (request, status = 400) => {
  await expect(request()).rejects.toHaveProperty('code', status)
}

const sendRequest = ({url, body, method}) =>
  axios.request({
    responseType: 'json',
    method: method || (body ? 'post' : 'get'),
    url: `${api}${apiVersion}/${url}`,
    data: body,
  }).then(({data}) => data)
    .catch(({response: {status, statusText, data: {message, stack}}}) =>
      Promise.reject(new HttpError(status, `${statusText} -> ${message} -> ${stack}`)))

const createAccount = async initialAmount => sendRequest({
  url: 'accounts',
  body: {initialAmount},
})

const expectDefinedFields = (object, fields) => {
  fields.forEach(field => expect(object[field]).toBeDefined())
}

module.exports = {
  sendRequest,
  expectHttpFailure,
  createAccount,
  expectDefinedFields,
}
