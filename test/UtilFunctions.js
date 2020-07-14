const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, ETH_ADDRESS } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockAddressResolver = artifacts.require('MockAddressResolver')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockUSDC = artifacts.require('MockUSDC')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract('xSNXCore, TradeAccounting: Address Setters and Utils', async () => {
  before(async () => {
    xsnx = await xSNXCore.deployed()
    addressResolver = await MockAddressResolver.deployed()
    susd = await MockSUSD.deployed()
    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    weth = await MockWETH.deployed()
    usdc = await MockUSDC.deployed()
    kyberProxy = await MockKyberProxy.deployed()
  })

  describe('Address Setters', async () => {
    // setters executed in deployment script
    // but difficult to test private variable setters directly
    it('should be able to set the address resolver address', async () => {
      await xsnx.setAddressResolverAddress(addressResolver.address)
      assert(true)
    })

    it('should be able to set the sUSD address on xSNX', async () => {
      await xsnx.setSusdAddress(susd.address)
      assert(true)
    })

    it('should be able to set the SNX address on xSNX', async () => {
      await xsnx.setSnxAddress(synthetix.address)
      assert(true)
    })

    it('should be able to set the rebalancing module address on xSNX', async () => {
      await xsnx.setRebalancingSetIssuanceModuleAddress(
        rebalancingModule.address,
      )
      assert(true)
    })

    it('should be able to set the rebalancing module address on TradeAccounting', async () => {
      await tradeAccounting.setAddressResolverAddress(addressResolver.address)
      assert(true)
    })

    it('should be able to set the Synthetix State address on TradeAccounting', async () => {
      await tradeAccounting.setSynthetixStateAddress()
      assert(true)
    })

    it('should be able to set the xSNX address on TradeAccounting', async () => {
      await tradeAccounting.setCallerAddress(xsnx.address)
      assert(true)
    })

    it('should be able to set the SNX address on TradeAccounting', async () => {
      await tradeAccounting.setSnxAddress(synthetix.address)
      assert(true)
    })

    it('should be able to set the sUSD address on TradeAccounting', async () => {
      await tradeAccounting.setSusdAddress(susd.address)
      assert(true)
    })

    it('should be able to set the Exchange Rates address on TradeAccounting', async () => {
      await tradeAccounting.setExchangeRatesAddress()
      assert(true)
    })
  })

  describe('ERC20 approvals', async () => {
    // approves executed in deployment script
    it('should approve TradeAccounting to spend SNX belonging to xSNX', async () => {
      const approved = await synthetix.allowance(
        xsnx.address,
        tradeAccounting.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve TradeAccounting to spend sUSD belonging to xSNX', async () => {
      const approved = await susd.allowance(
        xsnx.address,
        tradeAccounting.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve TradeAccounting to spend Set Asset #1 belonging to xSNX', async () => {
      const approved = await weth.allowance(
        xsnx.address,
        tradeAccounting.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve TradeAccounting to spend Set Asset #2 belonging to xSNX', async () => {
      const approved = await usdc.allowance(
        xsnx.address,
        tradeAccounting.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve Kyber to spend SNX belonging to TradeAccounting', async () => {
      const approved = await synthetix.allowance(
        tradeAccounting.address,
        kyberProxy.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve Kyber to spend sUSD belonging to TradeAccounting', async () => {
      const approved = await susd.allowance(
        tradeAccounting.address,
        kyberProxy.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve Kyber to spend Set Asset #1 belonging to TradeAccounting', async () => {
      const approved = await weth.allowance(
        tradeAccounting.address,
        kyberProxy.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })

    it('should approve Kyber to spend Set Asset #2 belonging to TradeAccounting', async () => {
      const approved = await usdc.allowance(
        tradeAccounting.address,
        kyberProxy.address,
      )
      assert.equal(approved.gt(BN_ZERO), true)
    })
  })
})
