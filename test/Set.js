const { BN } = require('@openzeppelin/test-helpers')
const { assertBNEqual, BN_ZERO, DEC_18 } = require('./utils')
const ExtTradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockCollateralSet = artifacts.require('MockCollateralSet')
const xSNXCore = artifacts.require('ExtXC')
const MockWETH = artifacts.require('MockWETH')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')

// uses ExtTradeAccounting wrapper to read internal functions externally
contract('TradeAccounting: Set Protocol', async (accounts) => {
  const [deployerAccount] = accounts

  const tokenAmount = web3.utils.toWei('100')

  before(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await ExtTradeAccounting.deployed()

    synthetix = await MockSynthetix.deployed()
    setToken = await MockSetToken.deployed()
    collateralSetToken = await MockCollateralSet.deployed()

    weth = await MockWETH.deployed()
    susd = await MockSUSD.deployed()
    usdc = await MockUSDC.deployed()

    await setToken.transfer(xsnx.address, tokenAmount)
    await weth.transfer(xsnx.address, tokenAmount)
  })


  describe('Set Issuance and Redemption', async () => {
    it('should return unit shares of a set', async () => {
      const unitShares = await tradeAccounting.extGetSetUnitShares()
      assert.equal(unitShares.gt(BN_ZERO), true)
    })

    it('should return the natural unit of a set', async () => {
      const naturalUnit = await tradeAccounting.extGetSetNaturalUnit()
      assert.equal(naturalUnit.gt(BN_ZERO), true)
    })

    it('should return the natural unit of the base set', async () => {
      const naturalUnit = await tradeAccounting.extGetBaseSetNaturalUnit()
      assert.equal(naturalUnit.gt(BN_ZERO), true)
    })

    it('should return the current set of the set token', async () => {
      const currentSet = await tradeAccounting.extGetCurrentSet()
      assert.isDefined(currentSet)
    })

    it('should return the base set components units', async () => {
      const units = await tradeAccounting.extGetBaseSetComponentUnits()
      assert.equal(units.gt(BN_ZERO), true)
    })

    it('should register a Set balance', async () => {
      const setBal = await tradeAccounting.extGetContractSetBalance()
      assert.equal(setBal.gt(BN_ZERO), true)
    })

    it('should calculate underlying collateral of Set balance', async () => {
      const unitShares = await tradeAccounting.extGetSetUnitShares()
      const naturalUnit = await tradeAccounting.extGetSetNaturalUnit()
      const setBal = await tradeAccounting.extGetContractSetBalance()

      const setBalanceCollateral = await tradeAccounting.extGetSetBalanceCollateral()

      assertBNEqual(
        setBalanceCollateral,
        setBal.mul(unitShares).div(naturalUnit),
      )
    })

    // assume WETH is active asset in ETH20SMACO
    it('should return the current set asset', async () => {
      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
      assert.equal(activeAsset, weth.address)
    })

    it('should register a balance in the active asset', async () => {
      const assetBal = await tradeAccounting.getActiveSetAssetBalance()
      assertBNEqual(assetBal, tokenAmount)
    })

    // Set internal accounting works the same for tokens of different decimals
    it('should calculate the correct set issuance quantity', async () => {
      const componentQuantity = await tradeAccounting.getActiveSetAssetBalance()
      const baseSetNaturalUnit = await tradeAccounting.extGetBaseSetNaturalUnit()
      const baseSetComponentUnits = await tradeAccounting.extGetBaseSetComponentUnits()
      const baseSetIssuable = componentQuantity
        .mul(baseSetNaturalUnit)
        .div(baseSetComponentUnits)

      const rebalancingSetNaturalUnit = await tradeAccounting.extGetSetNaturalUnit()
      const unitShares = await tradeAccounting.extGetSetUnitShares()
      // use same 1% issuance qty reduction as in contract
      const rebalancingSetQuantity = baseSetIssuable
        .mul(rebalancingSetNaturalUnit)
        .div(unitShares)
        .mul(new BN(99))
        .div(new BN(100))
        .div(rebalancingSetNaturalUnit)
        .mul(rebalancingSetNaturalUnit)

      assertBNEqual(
        rebalancingSetQuantity,
        await tradeAccounting.calculateSetQuantity(componentQuantity),
      )
    })

    it('should calculate the correct set redemption quantity for an active set asset with 18 decimals', async () => {
      const susdToBurn = new BN(web3.utils.toWei('10'))

      const multiplier = new BN(103)
      const percent = new BN(100)

      const expectedRate = (
        await tradeAccounting.getExpectedRate(
          susd.address,
          weth.address,
          susdToBurn,
        )
      ).expectedRate

      let setAssetToSell = expectedRate
        .mul(susdToBurn)
        .div(DEC_18)
        .mul(multiplier)
        .div(percent)

      const decimals = new BN(10).pow(await weth.decimals())
      setAssetToSell = setAssetToSell.mul(decimals).div(DEC_18)

      const setRedeemable = await tradeAccounting.calculateSetQuantity(
        setAssetToSell,
      )

      const setRedeemableCheck = await tradeAccounting.calculateSetRedemptionQuantity(
        susdToBurn,
      )
      assertBNEqual(setRedeemable, setRedeemableCheck)
    })

    it('should calculate the correct set redemption quantity for an active set asset with 6 decimals', async () => {
      await setToken.setActiveAsset(1);
      await collateralSetToken.setActiveAsset(1);
      
      const susdToBurn = new BN(web3.utils.toWei('10'))

      const multiplier = new BN(103)
      const percent = new BN(100)

      const expectedRate = (
        await tradeAccounting.getExpectedRate(
          susd.address,
          usdc.address,
          susdToBurn,
        )
      ).expectedRate

      let setAssetToSell = expectedRate
        .mul(susdToBurn)
        .div(DEC_18)
        .mul(multiplier)
        .div(percent)

      const decimals = new BN(10).pow(await usdc.decimals())
      setAssetToSell = setAssetToSell.mul(decimals).div(DEC_18)

      const setRedeemable = await tradeAccounting.calculateSetQuantity(
        setAssetToSell,
      )

      const setRedeemableCheck = await tradeAccounting.calculateSetRedemptionQuantity(
        susdToBurn,
      )
      assertBNEqual(setRedeemable, setRedeemableCheck)
    })
  })
})
