const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockSUSD = artifacts.require('MockSUSD')
const MockSetToken = artifacts.require('MockSetToken')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract('xSNXCore: Hedge function', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    xsnx = await xSNXCore.deployed()
    synthetix = await MockSynthetix.deployed()
    susd = await MockSUSD.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    setToken = await MockSetToken.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()

    await susd.transfer(synthetix.address, web3.utils.toWei('10'))
    await synthetix.setSusdAddress(susd.address)
    await web3.eth.sendTransaction({
      from: deployerAccount,
      value: web3.utils.toWei('5'),
      to: kyberProxy.address,
    })
    await setToken.transfer(rebalancingModule.address, web3.utils.toWei('2'))
  })

  describe('Staking and hedging', async () => {
    it('should revert when paused', async () => {
      await xsnx.pause()
      await truffleAssert.reverts(xsnx.hedge(), 'Pausable: paused')
    })

    it('should result in sUSD paid out to sender', async () => {
      await synthetix.setSusdAddress(susd.address)
      await xsnx.unpause()
      await xsnx.hedge({ from: account1 })
      const susdBal = await susd.balanceOf(account1)
      assert(susdBal.gt(BN_ZERO), true)
    })

    it('should result in an ETH balance', async () => {
      const ethBal = await web3.eth.getBalance(xsnx.address)
      assert(new BN(ethBal).gt(BN_ZERO), true)
    })

    it('should result in a Set balance', async () => {
      const setBal = await setToken.balanceOf(xsnx.address)
      assert(setBal.gt(BN_ZERO), true)
    })
  })
})
