const {Router} = require('express')
const bodyParser = require('body-parser')
const {createApiEndpoint} = require('lib/expressHelpers')

const accounts = require('./services/accounts')
const oracles = require('./services/oracles')
const predictions = require('./services/predictions')

const _ = createApiEndpoint

const router = new Router()

router.use(bodyParser.json())

// --------------------- ACCOUNTS ---------------------

router.post('/accounts', _(({body: {initialAmount}}) => accounts.createAccount(initialAmount)))

router.get(
  '/accounts/:accountAddress',
  _(({params: {accountAddress}}) => accounts.getAccountBalanceInEther(accountAddress))
)

router.post(
  '/accounts/:accountAddress/tokens',
  _(({params: {accountAddress}, body: {amount}}) => accounts.issueTokens(accountAddress, amount))
)

router.delete(
  '/accounts/:accountAddress/tokens',
  _(({params: {accountAddress}, body: {amount}}) => accounts.destroyTokens(accountAddress, amount))
)

router.post(
  '/__internal__/accounts/:accountAddress/destroyAllTokens',
  _(({params: {accountAddress}}) => accounts.destroyAllTokens(accountAddress))
)

router.put(
  '/accounts/:accountAddress/spenders/:spenderId',
  _(({params: {accountAddress, spenderId}, body: {amount}}) =>
    accounts.approveSpenderForAccount(accountAddress, spenderId, amount))
)

// --------------------- ORACLES ---------------------

router.post(
  '/oracles',
  _(({body: {name, operatorAddress, operatorPassword}}) =>
    oracles.createOracle(operatorAddress, operatorPassword, name))
)

router.get('/oracles/:oracleAddress', _(({body: {oracleAddress}}) => oracles.getOracle(oracleAddress)))

router.post(
  '/oracles/:oracleAddress/predictions',
  _(({params: {oracleAddress}, body: {operatorAddress, operatorPassword, predictionAddress, predictionOutcomeId}}) =>
    oracles.setPredictionOutcome(
      operatorAddress,
      operatorPassword,
      oracleAddress,
      predictionAddress,
      predictionOutcomeId
    ))
)

// --------------------- PREDICTIONS ---------------------

router.post(
  '/predictions',
  _(({body: {predictionOwner,
    predictionOwnerPassword,
    oracleAddress,
    happensAt,
    votingEndsAt,
    name,
    type,
    outcomeNames}}) =>
    predictions.createPoolPrediction(
      predictionOwner,
      predictionOwnerPassword,
      oracleAddress,
      happensAt,
      votingEndsAt,
      name,
      type,
      outcomeNames
    ))
)

router.post(
  '/predictions/:predictionAddress/votes',
  _(({body: {amount, outcomeId, accountAddress, accountPassword}, params: {predictionAddress}}) =>
    predictions.vote(predictionAddress, accountAddress, accountPassword, amount, outcomeId))
)

router.get(
  '/predictions/:predictionAddress/:accountAddress/votes',
  _(({params: {predictionAddress, accountAddress}}) =>
    predictions.getVote(predictionAddress, accountAddress))
)

router.get(
  '/predictions/:predictionAddress',
  _(({params: {predictionAddress}}) =>
    predictions.getPrediction(predictionAddress))
)

router.post(
  '/predictions/:predictionAddress/close',
  _(({body: {predictionOwner, password}, params: {predictionAddress}}) =>
    predictions.closePrediction(predictionAddress, predictionOwner, password))
)

router.post(
  '/predictions/:predictionAddress/withdraw',
  _(({body: {accountAddress, accountPassword}, params: {predictionAddress}}) =>
    predictions.withdrawFunds(predictionAddress, accountAddress, accountPassword))
)

module.exports = router
