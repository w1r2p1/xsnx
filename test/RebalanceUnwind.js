const {
  assertBNEqual,
  BN_ZERO,
  bn,
  DEC_18,
  increaseTime,
  FOUR_DAYS,
} = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockWETH = artifacts.require('MockWETH')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockCurveFi = artifacts.require('MockCurveFi')
const MockFeePool = artifacts.require('MockFeePool')
const xSNXCoreProxy = artifacts.require('xSNXCoreProxy')
const TradeAccountingProxy = artifacts.require('TradeAccountingProxy')

contract('xSNXCore: Rebalance Unwinds', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    taProxy = await TradeAccountingProxy.deployed()
    xsnxProxy = await xSNXCoreProxy.deployed()
    tradeAccounting = await TradeAccounting.at(taProxy.address)
    xsnx = await xSNXCore.at(xsnxProxy.address)
    
    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    setToken = await MockSetToken.deployed()
    rewardEscrow = await MockRewardEscrow.deployed()
    susd = await MockSUSD.deployed()
    usdc = await MockUSDC.deployed()
    weth = await MockWETH.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    exchangeRates = await MockExchangeRates.deployed()
    curve = await MockCurveFi.deployed()
    feePool = await MockFeePool.deployed()
  })

  describe('Unwinding staked position', async () => {
    it('should be able to unwind a staked position arbitrarily', async () => {
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
      await susd.transfer(curve.address, web3.utils.toWei('100'))
      await usdc.transfer(curve.address, '100000000')

      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )

      await xsnx.hedge(amountSusd, ['0', '0'], ['0', '0'], ethAllocation)

      const debtValueBefore = await tradeAccounting.extGetContractDebtValue() // usd terms
      const ethBalBefore = await tradeAccounting.getEthBalance()
      const snxBalanceBefore = await tradeAccounting.getSnxBalance()

      const someAmountDebt = bn(debtValueBefore).div(bn(2))
      const someAmountSnx = bn(snxBalanceBefore).div(bn(6))

      await xsnx.unwindStakedPosition(
        someAmountDebt,
        ['0', '0'],
        ['0', '0'],
        someAmountSnx,
      )

      const debtValueAfter = await tradeAccounting.extGetContractDebtValue()
      const ethBalAfter = await tradeAccounting.getEthBalance()
      const snxBalanceAfter = await tradeAccounting.getSnxBalance()

      assertBNEqual(snxBalanceBefore.gt(snxBalanceAfter), true)
      assertBNEqual(ethBalAfter.gt(ethBalBefore), true)
      assertBNEqual(debtValueBefore.gt(debtValueAfter), true)
    })
  })
})

contract('xSNXCore: Liquidation Unwind', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    taProxy = await TradeAccountingProxy.deployed()
    xsnxProxy = await xSNXCoreProxy.deployed()
    tradeAccounting = await TradeAccounting.at(taProxy.address)
    xsnx = await xSNXCore.at(xsnxProxy.address)

    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    setToken = await MockSetToken.deployed()
    rewardEscrow = await MockRewardEscrow.deployed()
    susd = await MockSUSD.deployed()
    usdc = await MockUSDC.deployed()
    weth = await MockWETH.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    exchangeRates = await MockExchangeRates.deployed()
    curve = await MockCurveFi.deployed()
    feePool = await MockFeePool.deployed()

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
    await susd.transfer(curve.address, web3.utils.toWei('100'))
    await usdc.transfer(curve.address, '100000000')

    await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
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
      amountSusd.sub(bn(1)),
      ['0', '0'],
      ['0', '0'],
      ethAllocation,
    )
  })

  describe('Liquidation Unwind', async () => {
    it('should revert if there has been a claiming transaction within the liquidation wait period', async () => {
      await susd.transfer(feePool.address, web3.utils.toWei('5'))
      await xsnx.claim(0, [0, 0], [0, 0], true, { from: deployerAccount })

      const susdToBurn = web3.utils.toWei('0.05')
      const minRates = ['0', '0']
      const snxToSell = web3.utils.toWei('0.02')
      await truffleAssert.reverts(
        xsnx.liquidationUnwind(susdToBurn, minRates, minRates, snxToSell),
        'Liquidation not available',
      )
    })

    // Some fraction of SNX position is likely still locked due to escrow, debt mgmt, etc
    it('should unwind an SNX position into ETH if waiting period has elapsed', async () => {
      const FOUR_WEEKS = 60 * 60 * 24 * 7 * 4
      await increaseTime(FOUR_WEEKS)

      const snxBal = await tradeAccounting.getSnxBalance()

      const debtValueBefore = await tradeAccounting.extGetContractDebtValue()
      const ethBalBefore = await tradeAccounting.getEthBalance()
      const minRates = ['0', '0']

      await xsnx.liquidationUnwind(
        bn(debtValueBefore).div(bn(2)),
        minRates,
        minRates,
        bn(snxBal).div(bn(2)),
      )

      const debtValueAfter = await tradeAccounting.extGetContractDebtValue()
      const ethBalAfter = await tradeAccounting.getEthBalance()

      assertBNEqual(bn(ethBalAfter).gt(bn(ethBalBefore)), true)
      assertBNEqual(bn(debtValueBefore).gt(bn(debtValueAfter)), true)
    })
  })
})
