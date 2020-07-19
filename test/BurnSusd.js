const { assertBNEqual, BN_ZERO, bn, DEC_18 } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockSetToken = artifacts.require('MockSetToken')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockExchangeRates = artifacts.require('MockExchangeRates')

contract('xSNXCore: Burning sUSD calculations', async (accounts) => {
  const [deployerAccount, account1] = accounts
  before(async () => {
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

  describe('Calculating sUSD to Burn', async () => {
    it('should calculate sUSD to burn to fix ratio', async () => {
      const debtToBurn = web3.utils.toWei('0.05') // 800% c-ratio
      const susdToFixRatio = await calculateSusdToFixRatio()

      assertBNEqual(bn(debtToBurn), susdToFixRatio)
    })

    it('should calculate sUSD to burn to eclipse escrowed SNX', async () => {
      const issuanceRatio = await tradeAccounting.extGetIssuanceRatio()
      const escrowedSnxVal = await tradeAccounting.extGetContractEscrowedSnxValue()

      const susdToEclipseEscrowed = await tradeAccounting.calculateSusdToBurnToEclipseEscrowed(
        issuanceRatio,
      )
      assertBNEqual(
        susdToEclipseEscrowed,
        bn(escrowedSnxVal).mul(bn(issuanceRatio)).div(DEC_18),
      )
    })

    it('should calculate total sUSD to burn for a given redemption', async () => {
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

      await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
      const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
      await xsnx.hedge(['0', '0'], activeAsset)

      const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
      const contractDebtValue = await tradeAccounting.extGetContractDebtValue()
      const issuanceRatio = await tradeAccounting.extGetIssuanceRatio()
      const susdToFixRatio = await tradeAccounting.calculateSusdToBurnToFixRatio(
        snxValueHeld,
        contractDebtValue,
        issuanceRatio
        )

      const escrowedSnxVal = await tradeAccounting.extGetContractEscrowedSnxValue()

      const susdToEclipseEscrowed = await tradeAccounting.calculateSusdToBurnToEclipseEscrowed(
        issuanceRatio,
      )

      const totalSupply = await xsnx.totalSupply()
      const tokensToRedeem = bn(totalSupply).div(bn(10))

      const susdToBurnForRedemption = await tradeAccounting.calculateSusdToBurnForRedemption(
        bn(susdToFixRatio).add(bn(susdToEclipseEscrowed)),
        tokensToRedeem,
        totalSupply,
        contractDebtValue,
        issuanceRatio,
      )
      
      const proFormaDebtAfterRatioAndEscrowAdjustment = bn(contractDebtValue).sub(bn(susdToFixRatio)).sub(bn(susdToEclipseEscrowed))
      const nonEscrowedSnxVal = await tradeAccounting.extGetContractOwnedSnxValue()
      
      const snxBalOwned = await tradeAccounting.extGetSnxBalanceOwned()
      const snxToSell = bn(snxBalOwned).mul(tokensToRedeem).div(bn(totalSupply))
      const snxRateAndTime = await exchangeRates.rateAndUpdatedTime(web3.utils.fromAscii('SNX'))
      const valueOfSnxToSell = snxToSell.mul(bn(snxRateAndTime[0])).div(DEC_18)
      const firstTerm = DEC_18.mul(proFormaDebtAfterRatioAndEscrowAdjustment)
      const secondTerm = bn(issuanceRatio).mul(valueOfSnxToSell)
      const thirdTerm = bn(issuanceRatio).mul(bn(nonEscrowedSnxVal))
      const result = ((firstTerm.add(secondTerm)).sub(thirdTerm)).div(DEC_18)

      assertBNEqual(result, susdToBurnForRedemption)
    })
  })
})

const calculateSusdToFixRatio = async () => {
  const snxValueHeld = web3.utils.toWei('10')
  const contractDebtValue = web3.utils.toWei('1.3') // debtToBurn for 800% c-ratio is 0.05e18
  const issuanceRatio = await tradeAccounting.extGetIssuanceRatio()
  const susdToFixRatio = await tradeAccounting.calculateSusdToBurnToFixRatio(
    snxValueHeld,
    contractDebtValue,
    issuanceRatio,
  )
  return susdToFixRatio
}
