const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, bn } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockWETH = artifacts.require('MockWETH')
const MockSetToken = artifacts.require('MockSetToken')
const MockCurveFi = artifacts.require('MockCurveFi')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const xSNXCoreProxy = artifacts.require('xSNXCoreProxy')
const TradeAccountingProxy = artifacts.require('TradeAccountingProxy')

contract('xSNXCore: Hedge function', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    taProxy = await TradeAccountingProxy.deployed()
    xsnxProxy = await xSNXCoreProxy.deployed()
    tradeAccounting = await TradeAccounting.at(taProxy.address)
    xsnx = await xSNXCore.at(xsnxProxy.address)

    synthetix = await MockSynthetix.deployed()
    susd = await MockSUSD.deployed()
    usdc = await MockUSDC.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    setToken = await MockSetToken.deployed()
    weth = await MockWETH.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    curve = await MockCurveFi.deployed()

    await susd.transfer(synthetix.address, web3.utils.toWei('100'))
    await synthetix.transfer(kyberProxy.address, web3.utils.toWei('1000'))
    await web3.eth.sendTransaction({
      from: deployerAccount,
      value: web3.utils.toWei('1'),
      to: kyberProxy.address,
    })
    await setToken.transfer(rebalancingModule.address, web3.utils.toWei('2'))
    await weth.transfer(kyberProxy.address, web3.utils.toWei('50'))
    await susd.transfer(curve.address, web3.utils.toWei('100'))
    await usdc.transfer(curve.address, '1000000000')
  })

  describe('Staking and hedging', async () => {
    it('should revert when called by non-owner', async () => {
      await truffleAssert.reverts(
        xsnx.hedge(0, [0, 0], [0, 0], 0, { from: account1 }),
        'Non-admin caller',
      )
    })

    it('should result in an ETH balance', async () => {
      const ethBalBefore = await web3.eth.getBalance(xsnx.address)
      await xsnx.mint('0', { value: web3.utils.toWei('0.01') })
      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )
      await xsnx.hedge(amountSusd, [0, 0], [0, 0], ethAllocation, {
        from: deployerAccount,
      })
      const ethBalAfter = await web3.eth.getBalance(xsnx.address)
      assert(bn(ethBalAfter).gt(bn(ethBalBefore)), true)
    })

    it('should result in a Set balance', async () => {
      const setBal = await setToken.balanceOf(xsnx.address)
      assert(setBal.gt(BN_ZERO), true)
    })
  })
})
