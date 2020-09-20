const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, ETH_ADDRESS } = require('./utils')
const xSNX = artifacts.require('xSNX')
const xSNXAdmin = artifacts.require('ExtXAdmin')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockUSDC = artifacts.require('MockUSDC')
const xSNXProxy = artifacts.require('xSNXProxy')
const xSNXAdminProxy = artifacts.require('xSNXAdminProxy')
const TradeAccountingProxy = artifacts.require('TradeAccountingProxy')

// Generic tests for Kyber
// Functional specific testing in mint, burn, claim, rebalance files
contract('TradeAccounting: Kyber', async () => {
  const tokenAmount = web3.utils.toWei('1')

  before(async () => {
    taProxy = await TradeAccountingProxy.deployed()
    xsnxAdminProxy = await xSNXAdminProxy.deployed()
    xsnxProxy = await xSNXProxy.deployed()
    tradeAccounting = await TradeAccounting.at(taProxy.address)
    xsnxAdmin = await xSNXAdmin.at(xsnxAdminProxy.address)
    xsnx = await xSNX.at(xsnxProxy.address)
    
    synthetix = await MockSynthetix.deployed()
    susd = await MockSUSD.deployed()
    weth = await MockWETH.deployed()
    usdc = await MockUSDC.deployed()
  })

  describe('Direct calls to Kyber swap functions', async () => {
    it('should result in a revert if swapTokenToToken is called by any address but the caller', async () => {
      await truffleAssert.reverts(
        tradeAccounting.swapTokenToToken(
          susd.address,
          tokenAmount,
          weth.address,
          0,
          0
        ),
        'Only xSNXAdmin contract can call',
      )
    })

    it('should result in a revert if swapTokenToEther is called by any address but the caller', async () => {
      await truffleAssert.reverts(
        tradeAccounting.swapTokenToEther(susd.address, tokenAmount, 0, 0),
        'Only xSNXAdmin contract can call',
      )
    })
  })
})
