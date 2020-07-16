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

contract('xSNXCore: Rebalance Set to Eth', async (accounts) => {
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

  describe('Rebalance Set to ETH', async () => {
    it('should be able to rebalance Set to ETH when necessary', async () => {
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

      const setBalance = await setToken.balanceOf(xsnx.address)
      const ethBalanceBefore = await tradeAccounting.getEthBalance()

      await setToken.transfer(xsnx.address, bn(setBalance).div(bn(10)))

      const setHoldingsBefore = await tradeAccounting.getSetHoldingsValueInWei()

      // this should fail if rebalance not necessary
      const setToSell = await tradeAccounting.calculateSetToSellForRebalanceSetToEth()
      assert(true)
      const activeAssetBalance = await tradeAccounting.getActiveSetAssetBalance()

      await xsnx.rebalanceSetToEth(setToSell, activeAsset, '0')

      await truffleAssert.reverts(
        tradeAccounting.calculateSetToSellForRebalanceSetToEth(),
        "Rebalance not necessary"
      )
    })
  })
})
