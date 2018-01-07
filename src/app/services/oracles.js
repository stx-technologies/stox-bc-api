/* eslint-disable no-underscore-dangle */
const {getOracleFactoryContract, getOracleContract} = require('./blockchain')
const {
  loggers: {logger},
  exceptions: {
    InvalidStateError,
    UnexpectedError,
    InvalidArgumentError,
    AlreadyExistsError,
  },
} = require('@welldone-software/node-toolbelt')

const {
  oracleFactoryContractAddress,
  defaultOracleContractAddress,
  oracleOperatorAccountAddress,
  oracleOperatorAccountPassword,
} = require('app/config')

const {
  unlockAccount,
  validateAddress,
} = require('app/utils')

const oraclesFactoryContract = getOracleFactoryContract(oracleFactoryContractAddress)

exports.isPredictionAlreadyRegistered = async (oracleAddress, predictionAddress) =>
  getOracleContract(oracleAddress).methods.predictionsRegistered(predictionAddress).call()

exports.getPredictionOutcome = async (oracleAddress, predictionAddress) => {
  const oracle = getOracleContract(oracleAddress)
  return oracle.methods.getOutcome(predictionAddress).call()
}

exports.createOracle = async (
  oracleOwner = oracleOperatorAccountAddress,
  password = oracleOperatorAccountPassword,
  name) => {
  validateAddress(oracleOwner)
  unlockAccount(oracleOwner, password)
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
  oracleOwner = oracleOperatorAccountAddress,
  password = oracleOperatorAccountPassword,
  oracleAddress = defaultOracleContractAddress,
  predictionAddress
) => {
  validateAddress(oracleOwner)
  validateAddress(oracleAddress)
  validateAddress(predictionAddress)
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
  oracleOwner = oracleOperatorAccountAddress,
  password = oracleOperatorAccountPassword,
  oracleAddress = defaultOracleContractAddress,
  predictionAddress,
  outcomeId,
  forceRegister = true
) => {
  validateAddress(oracleOwner)
  validateAddress(oracleAddress)
  validateAddress(predictionAddress)
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
