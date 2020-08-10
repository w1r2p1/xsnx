const { assertBNEqual, BN_ZERO, bn, DEC_18 } = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockWETH = artifacts.require('MockWETH')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockCurveFi = artifacts.require('MockCurveFi')

contract('xSNXCore: Rebalance to SNX', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    setToken = await MockSetToken.deployed()
    rewardEscrow = await MockRewardEscrow.deployed()
    susd = await MockSUSD.deployed()
    usdc = await MockUSDC.deployed()
    weth = await MockWETH.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    exchangeRates = await MockExchangeRates.deployed()
    curve = await MockCurveFi.deployed()
  })

  describe('Rebalance towards SNX', async () => {
    it('should be able to rebalance towards SNX when necessary', async () => {
      await setToken.transfer(rebalancingModule.address, web3.utils.toWei('20'))
      await web3.eth.sendTransaction({
        from: deployerAccount,
        value: web3.utils.toWei('1'),
        to: kyberProxy.address,
      })
      await susd.transfer(synthetix.address, web3.utils.toWei('500'))
      await weth.transfer(kyberProxy.address, web3.utils.toWei('60'))
      await weth.transfer(rebalancingModule.address, web3.utils.toWei('60'))
      await synthetix.transfer(kyberProxy.address, web3.utils.toWei('1000'))
      await susd.transfer(curve.address, web3.utils.toWei('100'))
      await usdc.transfer(curve.address, '100000000')

      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )

      await xsnx.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        ethAllocation,
      )

      await setToken.transfer(xsnx.address, web3.utils.toWei('0.005'))

      const isRequired = await tradeAccounting.isRebalanceTowardsSnxRequired()
      assert.equal(isRequired, true)

      await xsnx.rebalanceTowardsSnx('0')

      const isRequiredAfter = await tradeAccounting.isRebalanceTowardsSnxRequired()
      assert.equal(isRequiredAfter, false)
    })
  })
})
