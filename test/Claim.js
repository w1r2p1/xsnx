const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, DEC_18, bn, increaseTime, FOUR_DAYS } = require('./utils')
const xSNX = artifacts.require('xSNX')
const xSNXAdmin = artifacts.require('ExtXAdmin')
const TradeAccounting = artifacts.require('ExtTA')
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
const MockRewardEscrowV2 = artifacts.require('MockRewardEscrowV2')
const xSNXProxy = artifacts.require('xSNXProxy')
const xSNXAdminProxy = artifacts.require('xSNXAdminProxy')
const TradeAccountingProxy = artifacts.require('TradeAccountingProxy')

contract('xSNXCore: Claim', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    taProxy = await TradeAccountingProxy.deployed()
    xsnxAdminProxy = await xSNXAdminProxy.deployed()
    xsnxProxy = await xSNXProxy.deployed()
    tradeAccounting = await TradeAccounting.at(taProxy.address)
    xsnxAdmin = await xSNXAdmin.at(xsnxAdminProxy.address)
    xsnx = await xSNX.at(xsnxProxy.address)
    
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
    rewardEscrowV2 = await MockRewardEscrowV2.deployed()

    await susd.transfer(feePool.address, web3.utils.toWei('5'))
    await weth.transfer(rebalancingModule.address, web3.utils.toWei('5'))
  })

  describe('Claiming fees/rewards', async (accounts) => {
    it('should revert if called from non owner', async () => {
      await truffleAssert.reverts(
        xsnxAdmin.claim(0, [0, 0], [0, 0], true, { from: account1 }),
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
      await xsnxAdmin.claim(0, [0, 0], [0, 0], true, { from: deployerAccount })
      const withdrawableSusdFees = await susd.balanceOf(xsnx.address)
      assertBNEqual(withdrawableSusdFees.gt(BN_ZERO), true)
    })

    it('should exchange sUSD for ETH on successful claim', async () => {
      const ethBalBefore = await tradeAccounting.getEthBalance()
      await xsnxAdmin.claim(0, [0, 0], [0, 0], true, { from: deployerAccount })
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

      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      let amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
      amountSusd = amountSusd.sub(bn(1)) // to satisfy isFeesClaimable
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )
      await xsnxAdmin.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        ethAllocation,
      )

      await synthetix.addDebt(xsnxAdmin.address, web3.utils.toWei('0.02'))
      const debtBefore = await tradeAccounting.extGetContractDebtValue()
      
      const snxBal = await tradeAccounting.getSnxBalance()
      
      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()
      assertBNEqual(susdToBurnCollat.gt(BN_ZERO), true) // i.e., fees should be unclaimable until susd burn
 
      await xsnxAdmin.claim(susdToBurnCollat, [0, 0], [0, 0], false, {
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
      await rewardEscrowV2.setBalance(web3.utils.toWei('1'))
      await synthetix.addDebt(xsnxAdmin.address, web3.utils.toWei('0.2'))
      const debtBefore = await tradeAccounting.extGetContractDebtValue()

      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()
      assertBNEqual(susdToBurnCollat.gt(BN_ZERO), true) // i.e., fees should be unclaimable until susd burn

      await xsnxAdmin.claim(susdToBurnCollat, [0, 0], [0, 0], false, {
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
      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const debtBalance = await synthetix.debtBalanceOf(
        xsnxAdmin.address,
        web3.utils.fromAscii('sUSD'),
      )
      const amountSusd = bn(snxValueHeld).div(bn(8)).sub(bn(debtBalance))
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )

      await xsnxAdmin.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        ethAllocation,
      )

      const susdToBurnCollat = await tradeAccounting.calculateSusdToBurnToFixRatioExternal()
      assertBNEqual(susdToBurnCollat, BN_ZERO)

      await xsnxAdmin.claim(susdToBurnCollat, [0, 0], [0, 0], true, {
        from: deployerAccount,
      })

      // sUSD is immediately exchanged for ETH on claims so a
      // higher ETH balance signifies a successful claim
      const ethBalAfter = await tradeAccounting.getEthBalance()
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
    })
  })
})
