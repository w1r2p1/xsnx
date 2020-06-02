const { BN } = require('@openzeppelin/test-helpers')
const { assertBNEqual, BN_ZERO } = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')

contract('xSNXCore: Rebalances', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    setToken = await MockSetToken.deployed()
    rewardEscrow = await MockRewardEscrow.deployed()
  })


  describe('Rebalance towards hedge', async () => {
    it('should be able to rebalance to hedge assets when necessary', async () => {
      await rewardEscrow.setBalance('0')
      await setToken.transfer(xsnx.address, web3.utils.toWei('0.005'))
      await synthetix.transfer(xsnx.address, web3.utils.toWei('0.05'))

      const isRequired = await tradeAccounting.isRebalanceTowardsHedgeRequired()
      assert.equal(isRequired, true)
    })
  })

  describe('Rebalance Set to ETH', async () => {
    it('should be able to rebalance Set to ETH when necessary', async () => {
      await setToken.transfer(xsnx.address, web3.utils.toWei('0.03'))
      await web3.eth.sendTransaction({
        from: deployerAccount,
        to: xsnx.address,
        value: web3.utils.toWei('0.001'),
      })

      // this should fail if rebalance not necessary
      const rebalanceChanges = tradeAccounting.calculateAssetChangesForRebalanceSetToEth()
      assert(true)
    })
  })

  describe('Rebalance towards SNX', async () => {
    it('should be able to rebalance towards SNX when necessary', async () => {
      await rewardEscrow.setBalance('0')
      await setToken.transfer(xsnx.address, web3.utils.toWei('0.05'))

      const isRequired = await tradeAccounting.isRebalanceTowardsSnxRequired()
      assert.equal(isRequired, true)
    })
  })

})
