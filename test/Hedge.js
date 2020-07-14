const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, bn } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockSetToken = artifacts.require('MockSetToken')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract('xSNXCore: Hedge function', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    synthetix = await MockSynthetix.deployed()
    susd = await MockSUSD.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    setToken = await MockSetToken.deployed()
    weth = await MockWETH.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()

    await susd.transfer(synthetix.address, web3.utils.toWei('100'))
    await synthetix.transfer(kyberProxy.address, web3.utils.toWei('1000'))
    await web3.eth.sendTransaction({
      from: deployerAccount,
      value: web3.utils.toWei('1'),
      to: kyberProxy.address,
    })
    await setToken.transfer(rebalancingModule.address, web3.utils.toWei('2'))
    await weth.transfer(kyberProxy.address, web3.utils.toWei('50'))
  })

  describe('Staking and hedging', async () => {
    it('should revert when paused', async () => {
      await xsnx.pause()
      await truffleAssert.reverts(xsnx.hedge(['0', '0']), 'Pausable: paused')
    })

    it('should revert when called by non-owner', async () => {
      await xsnx.unpause()
      await truffleAssert.reverts(xsnx.hedge(['0', '0'], { from: account1}), 'Ownable: caller is not the owner')
    })

    it('should result in an ETH balance', async () => {
      const ethBalBefore = await web3.eth.getBalance(xsnx.address)
      await xsnx.mint('0', { value: web3.utils.toWei('0.01')})
      await xsnx.hedge(['0', '0'], { from: deployerAccount })
      const ethBalAfter = await web3.eth.getBalance(xsnx.address)
      assert(bn(ethBalAfter).gt(bn(ethBalBefore)), true)
    })

    it('should result in a Set balance', async () => {
      const setBal = await setToken.balanceOf(xsnx.address)
      assert(setBal.gt(BN_ZERO), true)
    })
  })
})
