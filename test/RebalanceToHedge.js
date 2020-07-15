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

contract('xSNXCore: Rebalances', async (accounts) => {
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
      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
      await xsnx.hedge(['0', '0'], activeAsset)

      const debtValueBefore = await tradeAccounting.extGetContractDebtValue()
      await synthetix.addDebt(xsnx.address, bn(debtValueBefore).div(bn(16))) // enough to get over rebalance threshold

      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const debtValue = await tradeAccounting.extGetContractDebtValue()
      const issuanceRatio = await tradeAccounting.extGetIssuanceRatio()

      const susdToFixRatio = await tradeAccounting.calculateSusdToBurnToFixRatio(
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

      const snxPrice = await exchangeRates.rateForCurrency(
        web3.utils.fromAscii('SNX'),
      )
      const snxToSell = valueToUnlockInUsd.mul(DEC_18).div(bn(snxPrice))

      const contractRebalanceReturn = await tradeAccounting.extCalculateAssetChangesForRebalanceToHedge()

      assertBNEqual(totalSusdToBurn, contractRebalanceReturn[0])
      assertBNEqual(snxToSell, contractRebalanceReturn[1])
    })

    it('should be able to rebalance to hedge assets when necessary', async () => {
      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()

      const debtBalance = await tradeAccounting.extGetContractDebtValue()
      const hedgeAssetsValueUsd = await tradeAccounting.extCalculateHedgeAssetsValueInUsd()

      const isRequired = await tradeAccounting.isRebalanceTowardsHedgeRequired()
      assert.equal(isRequired, true)

      const rebalanceVals = await tradeAccounting.getRebalanceTowardsHedgeUtils()
      await xsnx.rebalanceTowardsHedge(
        rebalanceVals[0], // susdToBurn
        activeAsset,
        ['0', '0'],
        rebalanceVals[1], // snxToSell
      )

      const debtBalanceAfter = await tradeAccounting.extGetContractDebtValue()
      const hedgeAssetsValueUsdAfter = await tradeAccounting.extCalculateHedgeAssetsValueInUsd()

      const isRequiredAfter = await tradeAccounting.isRebalanceTowardsHedgeRequired()
      assert.equal(isRequiredAfter, false)
    })
  })

})