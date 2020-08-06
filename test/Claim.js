const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, DEC_18, bn, increaseTime, FOUR_DAYS } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const ExtTradeAccounting = artifacts.require('ExtTA')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockFeePool = artifacts.require('MockFeePool')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockAddressResolver = artifacts.require('MockAddressResolver')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSynthetixState = artifacts.require('MockSynthetixState')
const MockWETH = artifacts.require('MockWETH')
const MockSetToken = artifacts.require('MockSetToken')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockCurveFi = artifacts.require('MockCurveFi')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')

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
    usdc = await MockUSDC.deployed()
    setToken = await MockSetToken.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    synthetixState = await MockSynthetixState.deployed()
    curve = await MockCurveFi.deployed()
    rewardEscrow = await MockRewardEscrow.deployed()

    await susd.transfer(feePool.address, web3.utils.toWei('5'))
    await weth.transfer(rebalancingModule.address, web3.utils.toWei('5'))
  })

  describe('Claiming fees/rewards', async (accounts) => {
    it('should revert if called from non owner', async () => {
      await truffleAssert.reverts(
        xsnx.claim(0, [0, 0], [0, 0], true, { from: account1 }),
        'Non-admin caller',
      )
    })

    it('should claim sUSD fees on claim', async () => {
      await web3.eth.sendTransaction({
        from: deployerAccount,
        to: kyberProxy.address,
        value: web3.utils.toWei('3'),
      })
      await susd.transfer(curve.address, web3.utils.toWei('100'))
      await usdc.transfer(curve.address, '100000000')
      await xsnx.claim(0, [0, 0], [0, 0], true, { from: deployerAccount })
      const withdrawableSusdFees = await xsnx.withdrawableSusdFees()
      assertBNEqual(withdrawableSusdFees.gt(BN_ZERO), true)
    })

    it('should exchange sUSD for ETH on successful claim', async () => {
      const ethBalBefore = await tradeAccounting.getEthBalance()
      await xsnx.claim(0, [0, 0], [0, 0], true, { from: deployerAccount })
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })

    it('should fix c-ratio before claiming if collateralization is below (w/ no escrowed bal)', async () => {
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
      await susd.transfer(curve.address, web3.utils.toWei('100'))
      await usdc.transfer(curve.address, '100000000')
      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })

      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      let amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
      amountSusd = amountSusd.sub(bn(1)) // to satisfy isFeesClaimable
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )
      await xsnx.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        activeAsset,
        ethAllocation,
      )

      await synthetix.addDebt(xsnx.address, web3.utils.toWei('0.02'))
      const debtBefore = await tradeAccounting.extGetContractDebtValue()
      
      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()
      assertBNEqual(susdToBurnCollat.gt(BN_ZERO), true) // i.e., fees should be unclaimable until susd burn
 
      await xsnx.claim(susdToBurnCollat, [0, 0], [0, 0], false, {
        from: deployerAccount,
      })
      
      const debtAfter = await tradeAccounting.extGetContractDebtValue()

      assertBNEqual(bn(debtBefore).gt(bn(debtAfter)), true)

      // sUSD is immediately exchanged for ETH on claims so a
      // higher ETH balance signifies a successful claim
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })

    it('should fix c-ratio before claiming if collateralization is below (w/ escrowed bal)', async () => {
      const ethBalBefore = await tradeAccounting.getEthBalance()
      await rewardEscrow.setBalance(web3.utils.toWei('1'))
      await synthetix.addDebt(xsnx.address, web3.utils.toWei('0.2'))
      const debtBefore = await tradeAccounting.extGetContractDebtValue()

      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()
      assertBNEqual(susdToBurnCollat.gt(BN_ZERO), true) // i.e., fees should be unclaimable until susd burn

      await xsnx.claim(susdToBurnCollat, [0, 0], [0, 0], false, {
        from: deployerAccount,
      })

      const debtAfter = await tradeAccounting.extGetContractDebtValue()

      assertBNEqual(bn(debtBefore).gt(bn(debtAfter)), true)

      // sUSD is immediately exchanged for ETH on claims so a
      // higher ETH balance signifies a successful claim
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })

    it('should claim if collateralization is over', async () => {
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
      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const debtBalance = await synthetix.debtBalanceOf(
        xsnx.address,
        web3.utils.fromAscii('sUSD'),
      )
      const amountSusd = bn(snxValueHeld).div(bn(8)).sub(bn(debtBalance))
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )

      await xsnx.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        activeAsset,
        ethAllocation,
      )

      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()
      assertBNEqual(susdToBurnCollat, BN_ZERO)

      await xsnx.claim(susdToBurnCollat, [0, 0], [0, 0], true, {
        from: deployerAccount,
      })

      // sUSD is immediately exchanged for ETH on claims so a
      // higher ETH balance signifies a successful claim
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })
  })
})
