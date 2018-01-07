/* eslint-disable no-underscore-dangle */
const {getStoxTokenContract, web3} = require('./blockchain')
const {
  stoxContractAddress,
  stoxOwnerAccountAddress,
  stoxOwnerAccountPassword,
} = require('app/config')

const stoxTokenContract = getStoxTokenContract(stoxContractAddress)

const {
  loggers: {logger},
  exceptions: {InvalidStateError, UnexpectedError},
} = require('@welldone-software/node-toolbelt')

const {
  unlockAccount,
  etherToWei,
  weiToEther,
  validateAddress,
  validateAmountPositiveOrZero,
} = require('app/utils')

const getAccountBalance = async (owner) => {
  validateAddress(owner)
  return stoxTokenContract.methods.balanceOf(owner).call()
}

const getAccountBalanceInEther = async accountAddress => ({
  balance: Number(weiToEther(await getAccountBalance(accountAddress))),
})

const issueTokens = async (issuedAccount, amount) => {
  validateAddress(issuedAccount)
  validateAmountPositiveOrZero(amount)

  const amountWei = etherToWei(amount.toString())

  if (amountWei > 0) {
    unlockAccount(stoxOwnerAccountAddress, stoxOwnerAccountPassword)
    const receipt = await stoxTokenContract.methods
      .issue(issuedAccount, amountWei)
      .send({from: stoxOwnerAccountAddress})

    if (receipt.events.Issuance === undefined) {
      throw new UnexpectedError(receipt)
    }

    logger.info({receipt})
  }

  return getAccountBalanceInEther(issuedAccount)
}

const destroyTokens = async (ownerAccount, amount) => {
  validateAddress(ownerAccount)
  validateAmountPositiveOrZero(amount)

  const {balance: currBalance} = await getAccountBalanceInEther(ownerAccount)

  if (amount > currBalance) {
    throw new InvalidStateError(`User doesn't have enough tokens to destroy. 
      Current user balance is ${currBalance}`)
  }

  const amountWei = etherToWei(amount.toString())

  if (amountWei > 0) {
    unlockAccount(stoxOwnerAccountAddress, stoxOwnerAccountPassword)
    const receipt = await stoxTokenContract.methods
      .destroy(ownerAccount, amountWei)
      .send({from: stoxOwnerAccountAddress})

    if (receipt.events.Destruction === undefined) {
      throw new UnexpectedError(receipt)
    }

    logger.info({receipt})
  }

  return getAccountBalanceInEther(ownerAccount)
}

const createAccount = async (initialAmount = 0) => {
  validateAmountPositiveOrZero(initialAmount)
  const address = await web3.eth.personal.newAccount('')
  if (initialAmount > 0) {
    await issueTokens(address, initialAmount)
  }
  return {address}
}

const approveSpenderForAccount = async (accountOwner, spender, amount) => {
  validateAddress(accountOwner)
  validateAddress(spender)

  const amountWei = etherToWei(amount)
  const currentAllowance = await stoxTokenContract.methods
    .allowance(accountOwner, spender)
    .call()

  if (amountWei > 0 && currentAllowance > 0) {
    throw new InvalidStateError('Cannot approve. Current allowance > 0.')
  }

  if (amountWei !== currentAllowance) {
    unlockAccount(accountOwner)

    const receipt = await stoxTokenContract.methods
      .approve(spender, amountWei)
      .send({from: accountOwner})

    if (receipt.events.Approval === undefined) {
      throw new UnexpectedError(receipt)
    }

    logger.info(receipt)
  }
}

const destroyAllTokens = async (accountAddress) => {
  const {balance} = await getAccountBalanceInEther(accountAddress)
  return destroyTokens(accountAddress, balance)
}

module.exports = {
  createAccount,
  approveSpenderForAccount,
  getAccountBalanceInEther,
  unlockAccount,
  issueTokens,
  destroyTokens,
  destroyAllTokens,
}
