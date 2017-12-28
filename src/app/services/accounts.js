/* eslint-disable no-underscore-dangle */
const {getStoxTokenContract, web3} = require('./blockchain')
const {logger} = require('lib/logger')

const {
  STOX_CONTRACT_ADDRESS,
  STOX_OWNER_ACCOUNT_ADDRESS,
  STOX_OWNER_ACCOUNT_PASSWORD,
} = require('app/config')

const stoxTokenContract = getStoxTokenContract(STOX_CONTRACT_ADDRESS)

const {
  InvalidStateError,
  UnexpectedError,
  InvalidArgumentError,
} = require('lib/exceptions')

const weiToEther = wei => web3.utils.fromWei(wei.toString(), 'ether')
const etherToWei = ether => web3.utils.toWei(ether.toString(), 'ether')

const unlockAccount = (account, password = '') =>
  web3.eth.personal.unlockAccount(account, password, '0x0')

const validateAddress = async (request) => {
  try {
    return await request()
  } catch (e) {
    throw new InvalidArgumentError('Invalid account address', e)
  }
}

const getAccountBalance = async owner =>
  validateAddress(async () => stoxTokenContract.methods.balanceOf(owner).call())

const getAccountBalanceInEther = async accountAddress => ({
  balance: Number(weiToEther(await getAccountBalance(accountAddress))),
})

const issueTokens = async (issuedAccount, amount) => {
  if (amount <= 0) {
    throw new InvalidArgumentError(`Invalid amount ${amount}`)
  }

  const amountWei = etherToWei(amount.toString())

  unlockAccount(STOX_OWNER_ACCOUNT_ADDRESS, STOX_OWNER_ACCOUNT_PASSWORD)
  const receipt = await validateAddress(async () => stoxTokenContract.methods
    .issue(issuedAccount, amountWei)
    .send({from: STOX_OWNER_ACCOUNT_ADDRESS}))

  if (receipt.events.Issuance === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})

  return getAccountBalanceInEther(issuedAccount)
}

const destroyTokens = async (ownerAccount, amount) => {
  if (amount <= 0) {
    throw new InvalidArgumentError(`Invalid amount ${amount}`)
  }

  const {balance: currBalance} = await getAccountBalanceInEther(ownerAccount)

  if (amount > currBalance) {
    throw new InvalidStateError(`User doesn't have enough tokens to destroy. 
      Current user balance is ${currBalance}`)
  }

  const amountWei = etherToWei(amount.toString())
  unlockAccount(STOX_OWNER_ACCOUNT_ADDRESS, STOX_OWNER_ACCOUNT_PASSWORD)
  const receipt = await stoxTokenContract.methods
    .destroy(ownerAccount, amountWei)
    .send({from: STOX_OWNER_ACCOUNT_ADDRESS})

  if (receipt.events.Destruction === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})

  return getAccountBalanceInEther(ownerAccount)
}

const createAccount = async (initialAmount = 0) => {
  const address = await web3.eth.personal.newAccount('')
  if (initialAmount > 0) {
    await issueTokens(address, initialAmount)
  }
  return {address}
}

const approveSpenderForAccount = async (accountOwner, spender, amount) => {
  const amountWei = etherToWei(amount)
  const currentAllowance = await stoxTokenContract.methods
    .allowance(accountOwner, spender)
    .call()

  if (amountWei > 0 && currentAllowance > 0) {
    throw new InvalidStateError('Cannot approve. Allowance > 0.')
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
