const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, DEC_18, bn } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const ExtTradeAccounting = artifacts.require('ExtTA')
const MockSUSD = artifacts.require('MockSUSD')
const MockFeePool = artifacts.require('MockFeePool')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockAddressResolver = artifacts.require('MockAddressResolver')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSynthetixState = artifacts.require('MockSynthetixState')
const MockWETH = artifacts.require('MockWETH')
const MockSetToken = artifacts.require('MockSetToken')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract('xSNXCore: Claim', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await ExtTradeAccounting.deployed()
    feePool = await MockFeePool.deployed()
    susd = await MockSUSD.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    addressResolver = await MockAddressResolver.deployed()
    exchRates = await MockExchangeRates.deployed()
    synthetix = await MockSynthetix.deployed()
    weth = await MockWETH.deployed()
    setToken = await MockSetToken.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    synthetixState = await MockSynthetixState.deployed()

    await susd.transfer(feePool.address, web3.utils.toWei('5'))
    await weth.transfer(rebalancingModule.address, web3.utils.toWei('5'))
  })

  describe('Claiming fees/rewards', async (accounts) => {
    it('should revert if called from non owner', async () => {
      await truffleAssert.reverts(
        xsnx.claim(0, [0, 0], true, { from: account1 }),
        'Ownable: caller is not the owner',
      )
    })

    it('should claim sUSD fees on claim', async () => {
      await web3.eth.sendTransaction({
        from: deployerAccount,
        to: kyberProxy.address,
        value: web3.utils.toWei('3'),
      })

      await xsnx.claim(0, [0, 0], true, { from: deployerAccount })
      const withdrawableSusdFees = await xsnx.withdrawableSusdFees()
      assertBNEqual(withdrawableSusdFees.gt(BN_ZERO), true)
    })

    it('should exchange sUSD for ETH on successful claim', async () => {
      const ethBalBefore = await tradeAccounting.getEthBalance()
      await xsnx.claim(0, [0, 0], true, { from: deployerAccount })
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })

    it('should fix c-ratio before claiming if collateralization is below', async () => {
      const ethBalBefore = await tradeAccounting.getEthBalance()
      await setToken.transfer(rebalancingModule.address, web3.utils.toWei('20'))
      await web3.eth.sendTransaction({
        from: deployerAccount,
        value: web3.utils.toWei('1'),
        to: kyberProxy.address,
      })
      await susd.transfer(synthetix.address, web3.utils.toWei('500'))
      await weth.transfer(kyberProxy.address, web3.utils.toWei('60'))
      await synthetix.transfer(kyberProxy.address, web3.utils.toWei('1000'))
      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
      await xsnx.hedge(['0', '0'])


      await synthetix.addDebt(xsnx.address, web3.utils.toWei('0.02'))  

      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()

      await xsnx.claim(susdToBurnCollat, [0, 0], true, {
        from: deployerAccount,
      })

      // sUSD is immediately exchanged for ETH on claims so a
      // higher ETH balance signifies a successful claim
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })
  })
})
