const { assertBNEqual, BN_ZERO, bn, DEC_18, increaseTime, FOUR_DAYS } = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNX = artifacts.require('xSNX')
const xSNXAdmin = artifacts.require('ExtXAdmin')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockWETH = artifacts.require('MockWETH')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockCurveFi = artifacts.require('MockCurveFi')
const xSNXProxy = artifacts.require('xSNXProxy')
const xSNXAdminProxy = artifacts.require('xSNXAdminProxy')
const TradeAccountingProxy = artifacts.require('TradeAccountingProxy')

contract('xSNXCore: Rebalances', async (accounts) => {
  const [deployerAccount, account1] = accounts

  beforeEach(async () => {
    taProxy = await TradeAccountingProxy.deployed()
    xsnxAdminProxy = await xSNXAdminProxy.deployed()
    xsnxProxy = await xSNXProxy.deployed()
    tradeAccounting = await TradeAccounting.at(taProxy.address)
    xsnxAdmin = await xSNXAdmin.at(xsnxAdminProxy.address)
    xsnx = await xSNX.at(xsnxProxy.address)

    synthetix = await MockSynthetix.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
    setToken = await MockSetToken.deployed()
    susd = await MockSUSD.deployed()
    usdc = await MockUSDC.deployed()
    weth = await MockWETH.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    exchangeRates = await MockExchangeRates.deployed()
    curve = await MockCurveFi.deployed()
  })

  describe('Rebalance towards hedge', async () => {
    it('should calculate asset changes for a rebalance to hedge', async () => {
      await setToken.transfer(rebalancingModule.address, web3.utils.toWei('20'))
      await web3.eth.sendTransaction({
        from: deployerAccount,
        value: web3.utils.toWei('1'),
        to: kyberProxy.address,
      })
      await susd.transfer(synthetix.address, web3.utils.toWei('500'))
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

      await xsnxAdmin.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        ethAllocation,
      )

      const debtValueBefore = await tradeAccounting.extGetContractDebtValue()
      await synthetix.addDebt(xsnxAdmin.address, bn(debtValueBefore).div(bn(16))) // enough to get over rebalance threshold

      const debtValue = await tradeAccounting.extGetContractDebtValue()
      const issuanceRatio = await tradeAccounting.extGetIssuanceRatio()

      const susdToFixRatio = await tradeAccounting.extCalculateSusdToBurnToFixRatio(
        snxValueHeld,
        debtValue,
        issuanceRatio,
      )
      const susdToEclipseEscrowed = await tradeAccounting.calculateSusdToBurnToEclipseEscrowed(
        issuanceRatio,
      )
      const hedgeAssetsValueUsd = await tradeAccounting.extCalculateHedgeAssetsValueInUsd()

      const valueToUnlockInUsd = bn(debtValue).sub(bn(hedgeAssetsValueUsd))
      const susdToBurnToUnlockTransfer = valueToUnlockInUsd
        .mul(bn(issuanceRatio))
        .div(DEC_18)
      const totalSusdToBurn = bn(susdToFixRatio)
        .add(bn(susdToEclipseEscrowed))
        .add(susdToBurnToUnlockTransfer)

      const snxPriceObj = await exchangeRates.rateAndUpdatedTime(
        web3.utils.fromAscii('SNX'),
      )
      const snxPrice = snxPriceObj[0]
      const snxToSell = valueToUnlockInUsd.mul(DEC_18).div(bn(snxPrice))

      const contractRebalanceReturn = await tradeAccounting.extCalculateAssetChangesForRebalanceToHedge()

      assertBNEqual(totalSusdToBurn, contractRebalanceReturn[0])
      assertBNEqual(snxToSell, contractRebalanceReturn[1])
    })

    it('should be able to rebalance to hedge assets when necessary', async () => {
      const isRequired = await tradeAccounting.isRebalanceTowardsHedgeRequired()
      assert.equal(isRequired, true)

      const rebalanceVals = await tradeAccounting.getRebalanceTowardsHedgeUtils()
      await xsnxAdmin.rebalanceTowardsHedge(
        rebalanceVals[0], // susdToBurn
        [0, 0],
        [0, 0],
        rebalanceVals[1], // snxToSell
      )

      const isRequiredAfter = await tradeAccounting.isRebalanceTowardsHedgeRequired()
      assert.equal(isRequiredAfter, false)
    })
  })
})
