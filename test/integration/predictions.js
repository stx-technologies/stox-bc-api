const {sendRequest, createAccount, expectHttpFailure, expectDefinedFields} = require('../utils')

const getDaysFromNow = (addDays = 0) => {
  const date = new Date()
  date.setUTCHours(date.getUTCHours() + (addDays * 24))
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const createPrediction = async (body) => {
  const defaultBody = {
    happensAt: getDaysFromNow(2),
    votingEndsAt: getDaysFromNow(1),
    name: 'nothing',
    type: 'pool',
    outcomeNames: ['option1', 'option2'],
  }
  return sendRequest({
    url: 'predictions',
    body: {...defaultBody, ...body},
  })
}

beforeEach(() => jest.setTimeout(30000))

describe('/predictions', () => {
  const expectPredictionCreationToFailWith = async (body) => {
    await expectHttpFailure(async () => createPrediction(body))
  }

  /*
    Currently, invalid time is <= EPOCH(aka 1970-1-1 02:00:00)
    The tests are intentionally written with dates that will likely fail the tests
    When the definition of `valid prediction time` will change
  */

  it('should throw when given an invalid happensAt time', async () => {
    await expectPredictionCreationToFailWith({happensAt: '1969-1-1'})
  })

  it('should throw when given an invalid votingEndsAt time', async () => {
    await expectPredictionCreationToFailWith({votingEndsAt: '1969-1-1'})
  })

  it('should throw when a prediction happens before the voting ends time', async () => {
    await expectPredictionCreationToFailWith({votingEndsAt: '2000-1-20', happensAt: '2000-1-19'})
  })

  it('should throw when not given a non-empty string name', async () => {
    await expectPredictionCreationToFailWith({name: ''})
    await expectPredictionCreationToFailWith({name: '     '})
    await expectPredictionCreationToFailWith({name: null})
    await expectPredictionCreationToFailWith({name: undefined})
    await expectPredictionCreationToFailWith({name: 500})
    await expectPredictionCreationToFailWith({name: true})
  })

  it('should throw when given no outcome names', async () => {
    await expectPredictionCreationToFailWith({outcomeNames: []})
  })

  it('should throw when given one outcome name', async () => {
    await expectPredictionCreationToFailWith({outcomeNames: ['outcome']})
  })

  it('should throw when given a type that is not pool', async () => {
    await expectPredictionCreationToFailWith({type: 'not-pool'})
  })

  it('should throw when given an invalid oracleAddress', async () => {
    await expectPredictionCreationToFailWith({oracleAddress: 'scoobydoo'})
  })

  it('should return a well defined response to creating a new prediction', async () => {
    const prediction = await createPrediction()
    expectDefinedFields(prediction, ['address', 'outcomeNamesIds'])
    expectDefinedFields(prediction.outcomeNamesIds, ['option1', 'option2'])
  })
})

describe('/predictions/:predictionAddress/votes', () => {
  const createAccountAndSendVote = async (predictionAddress, body) => {
    const {address: accountAddress} = await createAccount(2000)
    const defaultBody = {
      amount: 100,
      outcomeId: 1,
      accountAddress,
    }
    return sendRequest({
      url: `predictions/${predictionAddress}/votes`,
      body: {...defaultBody, ...body},
    })
  }

  const expectVoteToFailWith = async (predictionAddressOrVoteBody, voteBodyOrPredictionBody) => {
    if (typeof predictionAddressOrVoteBody !== 'string') {
      const {address: predictionAddress} = await createPrediction(voteBodyOrPredictionBody)
      await expectHttpFailure(async () =>
        createAccountAndSendVote(predictionAddress, predictionAddressOrVoteBody))
    } else {
      await expectHttpFailure(async () =>
        createAccountAndSendVote(predictionAddressOrVoteBody, voteBodyOrPredictionBody))
    }
  }

  it('should throw when given an invalid predictionAddress', async () => {
    await expectVoteToFailWith('scoobydoo')
  })

  it('should throw when given an invalid outcomeId', async () => {
    await expectVoteToFailWith({outcomeId: 'scoobydoo'})
  })

  it('should throw when given an invalid amount', async () => {
    const {address: predictionAddress} = await createPrediction()
    await expectVoteToFailWith(predictionAddress, {amount: 'scoobydoo'})
    await expectVoteToFailWith(predictionAddress, {amount: '   '})
    await expectVoteToFailWith(predictionAddress, {amount: ''})
    await expectVoteToFailWith(predictionAddress, {amount: -100})
    await expectVoteToFailWith(predictionAddress, {amount: 0})
    await expectVoteToFailWith(predictionAddress, {amount: true})
    await expectVoteToFailWith(predictionAddress, {amount: null})
    await expectVoteToFailWith(predictionAddress, {amount: undefined})
  })

  it('should throw when given an invalid outcomeId', async () => {
    await expectVoteToFailWith({outcomeId: 'scoobydoo'})
  })

  it('should throw when prediction vote time has ended', async () => {
    await expectVoteToFailWith({}, {votingEndsAt: '2000-1-1'})
  })

  it('should throw when balance is smaller than vote amount', async () => {
    await expectVoteToFailWith({amount: 2500})
  })

  it('should return a well defined response to performing a valid vote', async () => {
    const {address: predictionAddress} = await createPrediction()
    await createAccountAndSendVote(predictionAddress)
  })
})
