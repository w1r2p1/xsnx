const { assertBNEqual, BN_ZERO, bn, DEC_18 } = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockExchangeRates = artifacts.require('MockExchangeRates')

contract('xSNXCore: Unwinds', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    setToken = await MockSetToken.deployed()
    rewardEscrow = await MockRewardEscrow.deployed()
    susd = await MockSUSD.deployed()
    weth = await MockWETH.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    exchangeRates = await MockExchangeRates.deployed()
  })

  describe('Unwinding staked position', async () => {
    it('should be able to unwind a staked position arbitrarily', async () => {
      await setToken.transfer(rebalancingModule.address, web3.utils.toWei('20'))
      await web3.eth.sendTransaction({
        from: deployerAccount,
        value: web3.utils.toWei('1'),
        to: kyberProxy.address,
      })
      await susd.transfer(synthetix.address, web3.utils.toWei('1000'))
      await weth.transfer(kyberProxy.address, web3.utils.toWei('60'))
      await weth.transfer(rebalancingModule.address, web3.utils.toWei('60'))
      await synthetix.transfer(kyberProxy.address, web3.utils.toWei('1000'))

      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
      await xsnx.hedge(['0', '0'], activeAsset)

      const debtValueBefore = await tradeAccounting.extGetContractDebtValue() // usd terms
      const ethBalBefore = await tradeAccounting.getEthBalance()
      const snxBalanceBefore = await tradeAccounting.getSnxBalance()

      const someAmountDebt = bn(debtValueBefore).div(bn(2))
      const someAmountSnx = bn(snxBalanceBefore).div(bn(6))

      await xsnx.unwindStakedPosition(
        someAmountDebt,
        activeAsset,
        ['0', '0'],
        someAmountSnx,
      )
      const hedgeAssetsValueUsd = await tradeAccounting.extCalculateHedgeAssetsValueInUsd()

      const debtValueAfter = await tradeAccounting.extGetContractDebtValue()
      const ethBalAfter = await tradeAccounting.getEthBalance()
      const snxBalanceAfter = await tradeAccounting.getSnxBalance()

      assertBNEqual(snxBalanceBefore.gt(snxBalanceAfter), true)
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
      assertBNEqual(debtValueBefore.gt(debtValueAfter), true)
    })
  })
})
