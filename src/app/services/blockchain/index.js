const Web3 = require('web3')
const fs = require('fs')
const path = require('path')
const config = require('app/config')
// const {lowerFirst} = require('lodash')

const contractsDir = path.resolve(__dirname, './contracts')

const web3 = new Web3(new Web3.providers.HttpProvider(config.WEB3_URL))

const contracts = fs.readdirSync(contractsDir).reduce((obj, curr) => {
  const contractName = path.basename(curr, '.json')
  const name = `get${contractName}Contract`
  // eslint-disable-next-line
  const json = require(path.resolve(contractsDir, curr))
  obj[name] = contractAddress => new web3.eth.Contract(json, contractAddress)

  return obj
}, {})

/* const constantAddressContracts = {
  StoxToken: config.STOX_CONTRACT_ADDRESS,
  PredictionFactory: config.PREDICTION_FACTORY_CONTRACT_ADDRESS,
  OracleFactory: config.ORACLE_FACTORY_CONTRACT_ADDRESS,
  DefaultOracle: config.DEFAULT_ORACLE_CONTRACT_ADDRESS,
}

const contractNameFromFile = (fileName) => {
  const contractName = path.basename(fileName, '.json')
  return constantAddressContracts[contractName]
    ? `${lowerFirst(contractName)}Contract`
    : `get${contractName}Contract`
}

const createContract = (name, json) =>
  (constantAddressContracts[name]
    ? new web3.eth.Contract(json, constantAddressContracts[name])
    : address => new web3.eth.Contract(json, address))

const contracts = fs.readdirSync(contractsDir).reduce((obj, contractFile) => {
  const name = contractNameFromFile(contractFile)
  console.log({name})
  // eslint-disable-next-line import/no-dynamic-require,global-require
  const json = require(path.resolve(contractsDir, contractFile))
  obj[name] = createContract(name, json)
  return obj
}, {}) */

module.exports = {
  web3,
  ...contracts,
}
