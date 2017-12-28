/* eslint-disable no-underscore-dangle */
const {getOracleFactoryContract, getOracleContract} = require('./blockchain')
const {logger} = require('lib/logger')
const {unlockAccount} = require('./accounts')
const {
  InvalidStateError,
  UnexpectedError,
  InvalidArgumentError,
  AlreadyExistsError,
} = require('lib/exceptions')

const {
  ORACLE_FACTORY_CONTRACT_ADDRESS,
  DEFAULT_ORACLE_CONTRACT_ADDRESS,
  ORACLE_OPERATOR_ACCOUNT_ADDRESS,
  ORACLE_OPERATOR_ACCOUNT_PASSWORD,
} = require('app/config')

const oraclesFactoryContract = getOracleFactoryContract(ORACLE_FACTORY_CONTRACT_ADDRESS)

exports.isPredictionAlreadyRegistered = async (oracleAddress, predictionAddress) =>
  getOracleContract(oracleAddress).methods.predictionsRegistered(predictionAddress).call()

exports.getPredictionOutcome = async (oracleAddress, predictionAddress) => {
  const oracle = getOracleContract(oracleAddress)
  return oracle.methods.getOutcome(predictionAddress).call()
}

exports.createOracle = async (
  oracleOwner = ORACLE_OPERATOR_ACCOUNT_ADDRESS,
  pass = ORACLE_OPERATOR_ACCOUNT_PASSWORD,
  name) => {
  unlockAccount(oracleOwner, pass)
  const receipt = await oraclesFactoryContract.methods
    .createOracle(name)
    .send({from: oracleOwner})

  if (receipt.events.OracleCreated === undefined) {
    throw new UnexpectedError(receipt)
  }

  const {events: {OracleCreated: {returnValues}}} = receipt

  logger.info({receipt})

  return {address: returnValues._oracle}
}

exports.getOracleName = async oracleAddress =>
  getOracleContract(oracleAddress)
    .methods.name()
    .call()

const registerPredictionToOracle = async (
  oracleOwner = ORACLE_OPERATOR_ACCOUNT_ADDRESS,
  password = ORACLE_OPERATOR_ACCOUNT_PASSWORD,
  oracleAddress = DEFAULT_ORACLE_CONTRACT_ADDRESS,
  predictionAddress
) => {
  const oracle = getOracleContract(oracleAddress)
  const alreadyRegistered = await this.isPredictionAlreadyRegistered(oracleAddress, predictionAddress)
  if (alreadyRegistered) {
    throw new AlreadyExistsError(`Prediction ${predictionAddress} already registered in oracle ${oracleAddress}`)
  }

  unlockAccount(oracleOwner, password)

  const receipt = await oracle.methods
    .registerPrediction(predictionAddress)
    .send({from: oracleOwner})

  if (receipt.events.PredictionRegistered === undefined) {
    throw new UnexpectedError(receipt)
  }

  logger.info({receipt})
}

exports.setPredictionOutcome = async (
  oracleOwner = ORACLE_OPERATOR_ACCOUNT_ADDRESS,
  password = ORACLE_OPERATOR_ACCOUNT_PASSWORD,
  oracleAddress = DEFAULT_ORACLE_CONTRACT_ADDRESS,
  predictionAddress,
  outcomeId,
  forceRegister = true
) => {
  if (outcomeId <= 0) {
    throw new InvalidArgumentError(`Invalid outcome id ${outcomeId}`)
  }

  const oracle = getOracleContract(oracleAddress)
  const alreadyRegistered = await this.isPredictionAlreadyRegistered(oracleAddress, predictionAddress)
  if (!alreadyRegistered) {
    if (forceRegister) {
      await registerPredictionToOracle(oracleOwner, password, oracleAddress, predictionAddress)
    } else {
      throw new InvalidStateError(`Prediction ${predictionAddress} is no registered in oracle ${oracleAddress}`)
    }
  }

  const currentOutcomeId = this.getPredictionOutcome(oracleAddress, predictionAddress)
  if (currentOutcomeId !== outcomeId.toString()) {
    unlockAccount(oracleOwner, password)

    const receipt = await oracle.methods
      .setOutcome(predictionAddress, outcomeId)
      .send({from: oracleOwner})

    if (receipt.events.OutcomeAssigned === undefined) {
      throw new UnexpectedError(receipt)
    }

    logger.info({receipt})
  } else {
    logger.info(`Outcome ${outcomeId} already exists for prediction ${predictionAddress}`)
  }
}
