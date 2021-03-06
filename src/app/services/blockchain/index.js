const Web3 = require('web3')
const fs = require('fs')
const path = require('path')
const config = require('app/config')

const contractsDir = path.resolve(__dirname, './contracts')

const web3 = new Web3(new Web3.providers.HttpProvider(config.web3Url))

const contracts = fs.readdirSync(contractsDir).reduce((obj, curr) => {
  const contractName = path.basename(curr, '.json')
  const name = `get${contractName}Contract`
  // eslint-disable-next-line
  const json = require(path.resolve(contractsDir, curr))
  obj[name] = contractAddress => new web3.eth.Contract(json, contractAddress)

  return obj
}, {})


module.exports = {
  web3,
  ...contracts,
}
