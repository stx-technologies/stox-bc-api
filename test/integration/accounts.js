const {sendRequest, expectHttpFailure, createAccount} = require('../utils')

const accountBalance = address => sendRequest({url: `accounts/${address}`})

const issueTokens = (address, amount) => sendRequest({url: `accounts/${address}/tokens`, body: {amount}})

const destroyTokens = (address, amount) => sendRequest({
  url: `accounts/${address}/tokens`,
  method: 'delete',
  body: {amount},
})

beforeEach(() => jest.setTimeout(30000))

describe('/accounts', () => {
  it('should return new wallet address when calling accounts without initial amount', async () => {
    const {address} = await createAccount()
    expect(address).toBeDefined()
  })

  it('should return new wallet address when calling accounts with positive initial amount', async () => {
    const {address} = await createAccount(1000)
    expect(address).toBeDefined()
  })

  it('should return new wallet address when calling accounts with zero initial amount', async () => {
    const {address} = await createAccount(0)
    expect(address).toBeDefined()
  })

  it('should return new wallet address when calling accounts with negative initial amount', async () => {
    const {address} = await createAccount(-100)
    expect(address).toBeDefined()
  })
})

describe('/accounts/:accountAddress', () => {
  it('should return 0 balance when given a valid address with no initial balance', async () => {
    const {address} = await createAccount()
    const {balance} = await accountBalance(address)
    expect(balance).toBe(0)
  })

  it('should return 0 balance when given a valid address with negative initial balance', async () => {
    const {address} = await createAccount(-100)
    const {balance} = await accountBalance(address)
    expect(balance).toBe(0)
  })

  it('should return balance when given a valid address', async () => {
    const {address} = await createAccount(1500)
    const {balance} = await accountBalance(address)
    expect(balance).toBe(1500)
  })

  it('should throw when given an invalid address', async () => {
    await expectHttpFailure(async () => accountBalance('scoobydoo'))
  })
})

describe('accounts/:accountAddress/tokens (GET)', () => {
  it('should throw when issuing tokens to an invalid address', async () => {
    await expectHttpFailure(async () => issueTokens('scoobydoo', 400))
  })

  it('should throw when issuing an invalid amount of tokens to a valid address', async () => {
    const {address} = await createAccount(100)

    await expectHttpFailure(async () => issueTokens(address, 0))
    await expectHttpFailure(async () => issueTokens(address, -100))
  })

  it('should return new balance when issuing tokens to a valid address', async () => {
    const {address} = await createAccount(100)
    const {balance} = await issueTokens(address, 400)
    expect(balance).toBe(500)
  })
})

describe('/accounts/:accountAddress/tokens (DELETE)', () => {
  it('should throw when destroying tokens of an invalid address', async () => {
    await expectHttpFailure(async () => destroyTokens('scoobydoo', 400))
  })

  it('should throw when destroying an invalid amount of tokens of a valid address', async () => {
    const {address} = await createAccount(100)

    await expectHttpFailure(async () => destroyTokens(address, 0))
    await expectHttpFailure(async () => destroyTokens(address, -100))
  })

  it('should return new balance when destroy tokens of a valid address', async () => {
    const {address} = await createAccount(400)
    const {balance} = await destroyTokens(address, 50)
    expect(balance).toBe(350)
  })

  it('should return balance 0 when destroying all tokens of a valid address', async () => {
    const {address} = await createAccount(400)
    const {balance} = await destroyTokens(address, 400)
    expect(balance).toBe(0)
  })

  it('should throw when trying to destroy more tokens than address has', async () => {
    const {address} = await createAccount(400)
    await expectHttpFailure(async () => destroyTokens(address, 500))
  })
})

describe('/__internal__/accounts/:accountAddress/destroyAllTokens', () => {
  it('should throw when destroying all tokens of an invalid address(internal)', async () => {
    await expectHttpFailure(async () => sendRequest({
      url: '__internal__/accounts/scoobydoo/destroyAllTokens',
      method: 'post',
    }))
  })

  it('should return balance 0 when destroying all tokens(internal)', async () => {
    const {address} = await createAccount(1234)
    await sendRequest({
      url: `__internal__/accounts/${address}/destroyAllTokens`,
      method: 'post',
    })
    const {balance} = await accountBalance(address)
    expect(balance).toBe(0)
  })
})
