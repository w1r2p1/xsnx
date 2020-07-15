const { assertBNEqual, BN_ZERO, bn, DEC_18 } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')

contract('xSNXCore: Burning sUSD calculations', async () => {
  before(async () => {
    xsnx = await xSNXCore.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    synthetix = await MockSynthetix.deployed()
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
          issuanceRatio
      )
      console.log('susdToEclipseEscrowed', susdToEclipseEscrowed.toString())
      assertBNEqual(susdToEclipseEscrowed, bn(escrowedSnxVal).mul(bn(issuanceRatio)).div(DEC_18))
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
