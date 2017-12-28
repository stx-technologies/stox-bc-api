const {sendRequest, createAccount, expectDefinedFields} = require('../utils')

const createPrediction = () =>
  sendRequest({
    url: 'predictions',
    body: {
      happensAt: '2017-12-29',
      votingEndsAt: '2017-12-28',
      name: 'nothing',
      type: 'pool',
      outcomeNames: ['option1', 'option2'],
    },
  })

beforeEach(() => jest.setTimeout(30000))

describe('/predictions', () => {
  it('Should return new wallet address and outcome mapping to stox ids when creating new prediction', async () => {
    const prediction = await createPrediction()
    expectDefinedFields(prediction, ['address', 'outcomeNamesIds'])
  })
})

describe('/predictions/:predictionAddress/votes', () => {
  it('should return new wallet address and outcome to stox ids mapping when creating new prediction', async () => {
    const {address: accountAddress} = await createAccount(2000)

    const {address: predictionAddress} = await createPrediction()

    const vote = await sendRequest({
      url: `/predictions/${predictionAddress}/votes`,
      body: {
        amount: 100,
        outcomeId: '1',
        accountAddress,
      },
    })

    expectDefinedFields(vote, [
      'transactionHash',
      'account',
      'amount',
      'unitId',
      'outcomeId',
    ])
  })
})
