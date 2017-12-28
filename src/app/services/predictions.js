/* eslint-disable no-underscore-dangle */
const {getPredictionFactoryContract, getPoolPredictionContract, web3} = require('./blockchain')
const {logger} = require('lib/logger')
const accounts = require('./accounts')
const oracles = require('./oracles')

const {
  PREDICTION_FACTORY_CONTRACT_ADDRESS,
  PREDICTION_OPERATOR_ACCOUNT_ADDRESS,
  PREDICTION_OPERATOR_ACCOUNT_PASSWORD,
  DEFAULT_ORACLE_CONTRACT_ADDRESS,
  DEFAULT_ACCOUNT_PASSWORD,
} = require('app/config')

const predictionsFactoryContract = getPredictionFactoryContract(PREDICTION_FACTORY_CONTRACT_ADDRESS)

const {InvalidStateError, UnexpectedError, InvalidArgumentError} = require('lib/exceptions')

const Status = {
  Initializing: '0',
  Published: '1',
  Resolved: '2',
  Paused: '3',
  Canceled: '4',
}

const weiToEther = wei => web3.utils.fromWei(wei.toString(), 'ether')
const etherToWei = ether => web3.utils.toWei(ether.toString(), 'ether')
const dateToSeconds = date => Math.floor(new Date(date).getTime() / 1000)
const secondsToDate = date => new Date(date * 1000)

const unlockAccount = (account, password = '') => web3.eth.personal.unlockAccount(account, password, '0x0')

const publish = async (predictionOwner, password, predictionAddress) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  unlockAccount(predictionOwner, password)
  const receipt = await poolPredictionContract.methods.publish().send({from: predictionOwner})

  if (receipt.events.PredictionPublished === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})
}

const addOutcome = async (predictionOwner, password, predictionAddress, outcomeName) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  unlockAccount(predictionOwner, password)
  const receipt = await poolPredictionContract.methods.addOutcome(outcomeName).send({from: predictionOwner})

  if (receipt.events.OutcomeAdded === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})

  const {events: {OutcomeAdded: {returnValues: {_outcomeId: stoxId}}}} = receipt
  return {
    stoxId,
    outcomeName,
  }
}

const getOutcome = async (predictionAddress, outcomeId) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  return poolPredictionContract.methods.outcomes(outcomeId - 1).call()
}

const getNumberOfOutcomes = async (predictionAddress) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  return poolPredictionContract.methods.getOutcomeCount().call()
}

const isOutcomeValid = async (predictionAddress, outcomeId) => !!await getOutcome(predictionAddress, outcomeId)

exports.createPoolPrediction = async (
  predictionOwner = PREDICTION_OPERATOR_ACCOUNT_ADDRESS,
  password = PREDICTION_OPERATOR_ACCOUNT_PASSWORD,
  oracleAddress = DEFAULT_ORACLE_CONTRACT_ADDRESS,
  predictionEndTime,
  votingEndTime,
  name,
  type,
  outcomeNames
) => {
  const predictionEndTimeSeconds = dateToSeconds(predictionEndTime)
  const votingEndTimeSeconds = dateToSeconds(votingEndTime)

  // Check that prediction end time is valid
  if (!(predictionEndTimeSeconds > 0)) {
    throw new InvalidArgumentError('Prediction end time should be a number larger than 0')
  }

  // Check that unit buying end time is valid
  if (!(votingEndTimeSeconds > 0)) {
    throw new InvalidArgumentError('Prediction unit buying end time should be a number larger than 0')
  }

  // Check that unit buying end time is earlier than the prediction end time
  if (predictionEndTimeSeconds < votingEndTimeSeconds) {
    throw new InvalidArgumentError('Unit buying end time should be a earlier or equal to the prediction end time')
  }

  // Check prediction has a valid name
  if (!name) {
    throw new InvalidArgumentError('Prediction name shouldn\'t be empty')
  }

  if (type !== 'pool') {
    throw new InvalidArgumentError('Prediction type must be \'pool\'')
  }

  if (outcomeNames.length < 2) {
    throw new InvalidArgumentError(`Cannot publish prediction with ${outcomeNames.length} outcomes`)
  }

  unlockAccount(predictionOwner, password)
  const receipt = await predictionsFactoryContract.methods
    .createPoolPrediction(oracleAddress, predictionEndTimeSeconds, votingEndTimeSeconds, name)
    .send({from: predictionOwner, gas: 6000000})

  if (receipt.events.PoolPredictionCreated === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})
  const {events: {PoolPredictionCreated: {returnValues: {_newPrediction: predictionAddress}}}} = receipt
  const blockchainOutcomes = []

  // TODO: Replace with something more elegant. Maybe with https://www.npmjs.com/package/p-iteration
  // eslint-disable-next-line
  for (const outcome of outcomeNames) {
    blockchainOutcomes.push(await addOutcome(predictionOwner, password, predictionAddress, outcome))
  }

  publish(predictionOwner, password, predictionAddress)

  const outcomeNamesIds = blockchainOutcomes.reduce((res, {stoxId, outcomeName}) => {
    res[outcomeName] = stoxId
    return res
  }, {})

  return {address: predictionAddress, outcomeNamesIds}
}

const getVotingEndTime = async (predictionAddress) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  return secondsToDate(await poolPredictionContract.methods.unitBuyingEndTimeSeconds().call())
}

exports.vote = async (
  predictionAddress,
  accountAddress,
  accountPassword = DEFAULT_ACCOUNT_PASSWORD,
  amount,
  outcomeId) => {
  if (!isOutcomeValid(predictionAddress, outcomeId)) {
    throw new InvalidArgumentError(`Invalid outcome ${outcomeId}`)
  }

  const votingEndsAt = await getVotingEndTime(predictionAddress)
  if (votingEndsAt < Date.now()) {
    throw new InvalidStateError(`Voting time has ended at ${votingEndsAt}`)
  }

  const accountBalance = await accounts.getAccountBalanceInEther(accountAddress)
  if (accountBalance < amount) {
    throw new InvalidStateError(`Account has insufficient funds. Current balance is ${accountBalance}`)
  }

  await accounts.approveSpenderForAccount(accountAddress, predictionAddress, 0)
  await accounts.approveSpenderForAccount(accountAddress, predictionAddress, amount)

  unlockAccount(accountAddress, accountPassword)
  const amountWei = etherToWei(amount.toString())
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  const receipt = await poolPredictionContract.methods.buyUnit(amountWei, outcomeId).send({from: accountAddress})

  if (receipt.events.UnitBought === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})
}

exports.getVote = async (predictionAddress, accountAddress) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  const outcomeIds =
    Array.from(new Array(parseInt(await getNumberOfOutcomes(predictionAddress), 10)), (val, index) =>
      (index + 1).toString())
  const votes = []

  // TODO: Replace with something more elegant. Maybe with https://www.npmjs.com/package/p-iteration
  // eslint-disable-next-line
  for (const outcomeId of outcomeIds) {
    const unitsCount = await poolPredictionContract.methods.getUserUnitCount(accountAddress, outcomeId).call()

    if (unitsCount > 0) {
      const outcomeName = (await getOutcome(predictionAddress, outcomeId)).name
      const amount = weiToEther(await poolPredictionContract.methods.calculateUserUnitsValue(accountAddress).call())
      votes.push({outcomeId, outcomeName, amount})
    }
  }

  return {votes}
}

exports.getPrediction = async (predictionAddress) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  const outcomeIds =
    Array.from(new Array(parseInt(await getNumberOfOutcomes(predictionAddress), 10)), (val, index) =>
      (index + 1).toString())
  const outcomes = []

  // TODO: Replace with something more elegant. Maybe with https://www.npmjs.com/package/p-iteration
  // eslint-disable-next-line
  for (const outcomeId of outcomeIds) {
    const outcome = await getOutcome(predictionAddress, outcomeId)
    outcomes.push({id: outcome.id, name: outcome.name, tokenPool: weiToEther(outcome.tokens)})
  }

  const oracleAddress = await poolPredictionContract.methods.oracleAddress().call()
  const status = await poolPredictionContract.methods.status().call()
  const votingEndsAt = secondsToDate(await poolPredictionContract.methods.unitBuyingEndTimeSeconds().call())
  const happensAt = secondsToDate(await poolPredictionContract.methods.predictionEndTimeSeconds().call())
  const tokenPool = weiToEther(await poolPredictionContract.methods.tokenPool().call())
  const closingOutcome = await poolPredictionContract.methods.winningOutcomeId().call()

  return {oracleAddress, status, votingEndsAt, happensAt, tokenPool, closingOutcome, outcomes}
}

exports.closePrediction = async (
  predictionAddress,
  predictionOwner = PREDICTION_OPERATOR_ACCOUNT_ADDRESS,
  predictionOwnerPassword = PREDICTION_OPERATOR_ACCOUNT_PASSWORD) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)
  const oracleAddress = await poolPredictionContract.methods.oracleAddress().call()

  const isPredictionRegistered = await oracles.isPredictionAlreadyRegistered(oracleAddress, predictionAddress)
  if (!isPredictionRegistered) {
    throw new InvalidStateError(`Prediction is not registered in oracle ${oracleAddress}`)
  }

  const predictionStatus = await poolPredictionContract.methods.status().call()
  if (predictionStatus !== Status.Published) {
    throw new InvalidStateError(`Prediction status is not published (${Status.Published}).
     Current status is ${predictionStatus}`)
  }

  const votingEndsAt = secondsToDate(await poolPredictionContract.methods.unitBuyingEndTimeSeconds().call())
  if (votingEndsAt.getTime() > Date.now()) {
    throw new InvalidStateError(`Cannot close prediction while voting is still open.
     Voting end time is ${votingEndsAt}`)
  }

  const closingOutcomeId = oracles.getPredictionOutcome(oracleAddress, predictionAddress)
  if (!isOutcomeValid(predictionAddress, closingOutcomeId)) {
    throw new InvalidStateError(`Oracle outcome id is invalid. Current outcome id is (${closingOutcomeId})`)
  }

  unlockAccount(predictionOwner, predictionOwnerPassword)
  const receipt = await poolPredictionContract.methods.resolve().send({from: predictionOwner})

  if (receipt.events.PredictionResolved === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})
}

exports.withdrawFunds = async (
  predictionAddress,
  accountAddress,
  accountPassword = DEFAULT_ACCOUNT_PASSWORD) => {
  const poolPredictionContract = getPoolPredictionContract(predictionAddress)

  const predictionStatus = await poolPredictionContract.methods.status().call()
  if (predictionStatus !== Status.Resolved) {
    throw new InvalidStateError(`Prediction status is not resolved (${Status.Published}).
     Current status is ${predictionStatus}`)
  }

  const winningOutcomeId = await poolPredictionContract.methods.winningOutcomeId().call()
  const numberOfUnits = await poolPredictionContract.methods.getUserUnitCount(accountAddress, winningOutcomeId).call()
  console.log({winningOutcomeId, numberOfUnits})

  let amountWithdrawn = 0

  for (let i = 0; i < numberOfUnits; i++) {
    const unitId = await poolPredictionContract.methods.ownerUnits(accountAddress, winningOutcomeId, i).call()
    const unit = await poolPredictionContract.methods.units(unitId - 1).call()
    const isUnitWithdrawn = unit[3] // TODO: Convert Solidity struct array into a nice js object

    if (!isUnitWithdrawn) {
      unlockAccount(accountAddress, accountPassword)
      const receipt = await poolPredictionContract.methods.withdrawUnit(unitId).send({from: accountAddress})

      if (receipt.events.UnitWithdrawn === undefined) {
        throw new UnexpectedError(receipt)
      } else {
        amountWithdrawn += parseFloat(weiToEther(receipt.events.UnitWithdrawn.returnValues._tokenAmount))
        logger.info({receipt})
      }
    }
  }

  return {amountWithdrawn}
}
