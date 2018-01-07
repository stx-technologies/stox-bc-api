const {web3} = require('./services/blockchain')
const {
  exceptions: {InvalidArgumentError},
} = require('@welldone-software/node-toolbelt')

const weiToEther = wei => web3.utils.fromWei(wei.toString(), 'ether')
const etherToWei = ether => web3.utils.toWei(ether.toString(), 'ether')

const dateToSeconds = date => Math.floor(new Date(date).getTime() / 1000)
const secondsToDate = date => new Date(date * 1000)

const validateAddress = (address) => {
  if (!web3.utils.isAddress(address)) {
    throw new InvalidArgumentError(`Invalid address ${address}`)
  }
}

const unlockAccount = (account, password = '') =>
  web3.eth.personal.unlockAccount(account, password, '0x0')

const validateAmountPositive = (amount) => {
  let isValid

  if ((typeof amount !== 'number') && (typeof amount !== 'string')) {
    isValid = false
  } else if ((typeof amount === 'string') && !(/^\+?[1-9][\d]*$/.test(amount))) {
    isValid = false
  } else if ((typeof amount === 'number') && (Number.isNaN(amount) || amount <= 0)) {
    isValid = false
  } else {
    isValid = true
  }

  if (!isValid) {
    throw new InvalidArgumentError(`Invalid amount ${amount}`)
  }
}

const validateAmountPositiveOrZero = (amount) => {
  let isValid

  if ((typeof amount !== 'number') && (typeof amount !== 'string')) {
    isValid = false
  } else if ((typeof amount === 'string') && !(/^\+?[0-9][\d]*$/.test(amount))) {
    isValid = false
  } else if ((typeof amount === 'number') && (Number.isNaN(amount) || amount < 0)) {
    isValid = false
  } else {
    isValid = true
  }

  if (!isValid) {
    throw new InvalidArgumentError(`Invalid amount ${amount}`)
  }
}

const validateDate = (date) => {
  const timestamp = new Date(date).getTime()
  if (Number.isNaN(timestamp) || timestamp <= 0) {
    throw new InvalidArgumentError(`Invalid date ${date}`)
  }
}

module.exports = {
  weiToEther,
  etherToWei,
  unlockAccount,
  validateAddress,
  validateAmountPositiveOrZero,
  validateAmountPositive,
  validateDate,
  dateToSeconds,
  secondsToDate,
}
