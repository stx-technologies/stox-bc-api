const {configs: {mapEnv}} = require('@welldone-software/node-toolbelt')

module.exports = mapEnv({
  port: 8090,
  web3Url: 'http://localhost:8545/',
  stoxContractAddress: '',
  stoxOwnerAccountAddress: '',
  stoxOwnerAccountPassword: '',
  predictionOperatorAccountAddress: '',
  predictionOperatorAccountPassword: '',
  oracleOperatorAccountAddress: '',
  oracleOperatorAccountPassword: '',
  oracleFactoryContractAddress: '',
  predictionFactoryContractAddress: '',
  defaultOracleContractAddress: '',
  defaultAccountPassword: '',
})
