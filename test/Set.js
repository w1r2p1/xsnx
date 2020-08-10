const { BN } = require('@openzeppelin/test-helpers')
const { assertBNEqual, BN_ZERO, DEC_18, DEC_6, bn } = require('./utils')
const ExtTradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockCollateralSet = artifacts.require('MockCollateralSet')
const xSNXCore = artifacts.require('ExtXC')
const MockWETH = artifacts.require('MockWETH')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockCurveFi = artifacts.require('MockCurveFi')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract(
  'TradeAccounting: Set Protocol: 18 Dec Active Asset',
  async (accounts) => {
    const [deployerAccount] = accounts

    before(async () => {
      xsnx = await xSNXCore.deployed()
      tradeAccounting = await ExtTradeAccounting.deployed()

      synthetix = await MockSynthetix.deployed()
      setToken = await MockSetToken.deployed()
      collateralSetToken = await MockCollateralSet.deployed()

      weth = await MockWETH.deployed()
      susd = await MockSUSD.deployed()
      usdc = await MockUSDC.deployed()
      kyberProxy = await MockKyberProxy.deployed()
      rebalancingModule = await MockRebalancingModule.deployed()
      curve = await MockCurveFi.deployed()
      exchangeRates = await MockExchangeRates.deployed()

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

      await xsnx.hedge(amountSusd, ['0', '0'], ['0', '0'], ethAllocation)
    })

    describe('Set Issuance and Redemption with 18 decimal asset (WETH)', async () => {
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

      it('should return the current set asset', async () => {
        const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
        assert.equal(activeAsset, weth.address)
      })

      it('should register a balance in the active asset', async () => {
        await weth.transfer(xsnx.address, '100')
        const assetBal = await tradeAccounting.getActiveSetAssetBalance()
        assertBNEqual(assetBal.gt(BN_ZERO), true)
      })

      // Set internal accounting works the same for tokens of different decimals
      it('should calculate the correct set issuance quantity', async () => {
        await weth.transfer(xsnx.address, web3.utils.toWei('1.5'))
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

        const activeAssetSymbol = await tradeAccounting.extGetActiveAssetSynthSymbol()
        let activeAssetUsdRate = await exchangeRates.rateAndUpdatedTime(
          activeAssetSymbol,
        )
        activeAssetUsdRate = activeAssetUsdRate[0]
        const expectedSetAssetRate = DEC_18.mul(DEC_18).div(
          bn(activeAssetUsdRate),
        )

        let setAssetToSell = expectedSetAssetRate
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

      it('should calculate Set holdings in wei correctly', async () => {
        // e.g. 100 usdc or 10 weth underlying Set holdings
        const underlyingTokens = await tradeAccounting.extGetSetCollateralTokens()
        const decimals = await weth.decimals()
        const underlyingTokensAdjusted = bn(underlyingTokens)
          .mul(DEC_18)
          .div(DEC_18) // WETH = 18 dec

        const activeAssetSymbol = await tradeAccounting.extGetActiveAssetSynthSymbol()
        let activeAssetUsdRate = await exchangeRates.rateAndUpdatedTime(
          activeAssetSymbol,
        )
        activeAssetUsdRate = activeAssetUsdRate[0]

        let ethUsdRate = await exchangeRates.rateAndUpdatedTime(
          web3.utils.fromAscii('sETH'),
        )
        ethUsdRate = ethUsdRate[0]

        const setValueEth = bn(underlyingTokensAdjusted)
          .mul(bn(activeAssetUsdRate))
          .div(bn(ethUsdRate))

        const setValueEthContract = await tradeAccounting.getSetHoldingsValueInWei()

        assertBNEqual(setValueEth, setValueEthContract)
      })
    })
  },
)

contract(
  'TradeAccounting: Set Protocol: 6 Decimal Active Asset (USDC)',
  async (accounts) => {
    const [deployerAccount] = accounts
    before(async () => {
      xsnx = await xSNXCore.deployed()
      tradeAccounting = await ExtTradeAccounting.deployed()

      synthetix = await MockSynthetix.deployed()
      setToken = await MockSetToken.deployed()
      collateralSetToken = await MockCollateralSet.deployed()

      weth = await MockWETH.deployed()
      susd = await MockSUSD.deployed()
      usdc = await MockUSDC.deployed()
      kyberProxy = await MockKyberProxy.deployed()
      rebalancingModule = await MockRebalancingModule.deployed()
      curve = await MockCurveFi.deployed()
      exchangeRates = await MockExchangeRates.deployed()

      await setToken.transfer(
        rebalancingModule.address,
        web3.utils.toWei('1000'),
      )
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

      await rebalancingModule.toggleActiveAssetIndex()
      await setToken.toggleActiveAssetIndex()
      await collateralSetToken.toggleActiveAssetIndex()

      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
      const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
        amountSusd,
      )

      await xsnx.hedge(
        amountSusd,
        ['0', '0'],
        ['0', '0'],
        ethAllocation,
      )
    })

    describe('Set Issuance and Redemption with 6 decimal asset (USDC)', async () => {
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

      it('should return the current set asset', async () => {
        const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
        assert.equal(activeAsset, usdc.address)
      })

      // residue/dust still there but most will have been allocated to Set
      it('should register a balance in the active asset', async () => {
        await usdc.transfer(xsnx.address, '100')
        const assetBal = await tradeAccounting.getActiveSetAssetBalance()
        assertBNEqual(assetBal.gt(BN_ZERO), true)
      })

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

      it('should calculate the correct set redemption quantity for an active set asset with 6 decimals', async () => {
        const susdToBurn = new BN(web3.utils.toWei('10'))

        const multiplier = new BN(103)
        const percent = new BN(100)

        const activeAssetSymbol = await tradeAccounting.extGetActiveAssetSynthSymbol()
        let activeAssetUsdRate = await exchangeRates.rateAndUpdatedTime(
          activeAssetSymbol,
        )
        activeAssetUsdRate = activeAssetUsdRate[0]
        const expectedSetAssetRate = DEC_18.mul(DEC_18).div(
          bn(activeAssetUsdRate),
        )

        let setAssetToSell = expectedSetAssetRate
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

      it('should calculate Set holdings in wei correctly', async () => {
        // e.g. 100 usdc or 10 weth underlying Set holdings
        const underlyingTokens = await tradeAccounting.extGetSetCollateralTokens()
        const underlyingTokensAdjusted = bn(underlyingTokens)
          .mul(DEC_18)
          .div(DEC_6) // USDC = 6 dec

        const activeAssetSymbol = await tradeAccounting.extGetActiveAssetSynthSymbol()
        let activeAssetUsdRate = await exchangeRates.rateAndUpdatedTime(
          activeAssetSymbol,
        )
        activeAssetUsdRate = activeAssetUsdRate[0]

        let ethUsdRate = await exchangeRates.rateAndUpdatedTime(
          web3.utils.fromAscii('sETH'),
        )
        ethUsdRate = ethUsdRate[0]

        const setValueEth = bn(underlyingTokensAdjusted)
          .mul(bn(activeAssetUsdRate))
          .div(bn(ethUsdRate))

        const setValueEthContract = await tradeAccounting.getSetHoldingsValueInWei()

        assertBNEqual(setValueEth, setValueEthContract)
      })
    })
  },
)
