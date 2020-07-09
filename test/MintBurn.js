const { BN } = require('@openzeppelin/test-helpers')
const { assertBNEqual, BN_ZERO, toNumber, DEC_18, bn } = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockSetToken = artifacts.require('MockSetToken')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract('xSNXCore: Minting', async (accounts) => {
  const [deployerAccount, account1] = accounts
  const ethValue = web3.utils.toWei('0.1')

  before(async () => {
    xsnx = await xSNXCore.deployed()
    synthetix = await MockSynthetix.deployed()
    kyberProxy = await MockKyberProxy.deployed()
    tradeAccounting = await TradeAccounting.deployed()
    susd = await MockSUSD.deployed()
    weth = await MockWETH.deployed()
    setToken = await MockSetToken.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
  })

  describe('NAV calculations on issuance', async () => {
    it('should correctly calculate NAV on issuance', async () => {
      const nonSnxAssetValue = await tradeAccounting.extCalculateNonSnxAssetValue()
      const debtValue = await tradeAccounting.extGetContractDebtValue()

      const weiPerOneSnx = web3.utils.toWei('0.01')
      const snxBalanceBefore = web3.utils.toWei('100')
      const snxTokenValueInWei = bn(snxBalanceBefore)
        .mul(bn(weiPerOneSnx))
        .div(bn(DEC_18))

      const navOnMint = await tradeAccounting.extCalculateNetAssetValueOnMint(
        weiPerOneSnx,
        snxBalanceBefore,
      )
      assertBNEqual(
        navOnMint,
        bn(snxTokenValueInWei).add(bn(nonSnxAssetValue)).sub(bn(debtValue)),
      )
    })
  })

  it('should correctly calculate number of tokens to mint', async () => {
    await synthetix.transfer(kyberProxy.address, web3.utils.toWei('100'))
    await xsnx.mint(0, { value: web3.utils.toWei('0.01') })

    const totalSupply = await xsnx.totalSupply()
    const snxBalanceBefore = await synthetix.balanceOf(xsnx.address)
    const snxAcquired = web3.utils.toWei('9.965') // 10 less 0.35% fee 
    await synthetix.transfer(xsnx.address, snxAcquired)
    const snxBalanceAfter = await synthetix.balanceOf(xsnx.address)

    const ethUsedForSnx = web3.utils.toWei('0.1')

    const weiPerOneSnx = await tradeAccounting.extGetWeiPerOneSnx(snxBalanceBefore, ethUsedForSnx)
    const snxTokenValueInWei = bn(snxBalanceBefore)
      .mul(bn(weiPerOneSnx))
      .div(bn(DEC_18))

    const navOnMint = await tradeAccounting.extCalculateNetAssetValueOnMint(
      weiPerOneSnx,
      snxBalanceBefore,
    )
    const pricePerToken = navOnMint.mul(DEC_18).div(bn(totalSupply))
    const tokensToMint = bn(ethUsedForSnx).mul(DEC_18).div(pricePerToken)

    const contractTokensToMint = await tradeAccounting.calculateTokensToMint(
      snxBalanceBefore,
      ethUsedForSnx,
      totalSupply,
    )

    assertBNEqual(tokensToMint, contractTokensToMint)
  })

  describe('Minting xSNX tokens', async () => {
    it('should revert if no ETH is sent', async () => {
      await truffleAssert.reverts(
        xsnx.mint(0, { value: 0, from: account1 }),
        'Must send ETH',
      )
    })

    it('should revert if contract is paused', async () => {
      await xsnx.pause({ from: deployerAccount })
      await truffleAssert.reverts(
        xsnx.mint(0, { value: ethValue, from: account1 }),
        'Pausable: paused',
      )
    })

    it('should buy SNX with ETH', async () => {
      await xsnx.unpause({ from: deployerAccount })
      await synthetix.transfer(kyberProxy.address, web3.utils.toWei('100'))
      await xsnx.mint(0, { value: ethValue, from: account1 })

      const xsnxBalSnx = await synthetix.balanceOf(xsnx.address)
      assert.equal(xsnxBalSnx.gt(BN_ZERO), true)
    })

    it('should issue xSNX token to minter', async () => {
      const xsnxBal = await xsnx.balanceOf(account1)
      assert.equal(xsnxBal.gt(BN_ZERO), true)
    })

    it('should charge an ETH fee on mint equal to fee divisor', async () => {
      const withdrawableFeesBefore = await xsnx.withdrawableEthFees()
      const feeDivisor = await xsnx.feeDivisor()
      await xsnx.mint(0, { value: ethValue })
      const withdrawableFeesAfter = await xsnx.withdrawableEthFees()
      assertBNEqual(
        withdrawableFeesAfter.sub(withdrawableFeesBefore),
        bn(ethValue).div(bn(feeDivisor)),
      )
    })
  })
  
  describe('NAV calculations on Redemption', async() => {
      it('should correctly calculate NAV on redemption', async() => {
        const nonSnxAssetValue = await tradeAccounting.extCalculateNonSnxAssetValue()
        const debtValue = await tradeAccounting.extGetContractDebtValue()
      })
  })
})


  //   it('should burn tokens up to the redemption value equivalent of ETH balance', async () => {
  //     await synthetix.setSusdAddress(susd.address)
  //     await susd.transfer(synthetix.address, web3.utils.toWei('500'))
  //     await setToken.transfer(rebalancingModule.address, web3.utils.toWei('20'))
  //     await web3.eth.sendTransaction({
  //       from: deployerAccount,
  //       value: web3.utils.toWei('1'),
  //       to: kyberProxy.address,
  //     })
  //     await setToken.transfer(rebalancingModule.address, web3.utils.toWei('2'))
  //     await xsnx.mint(0, { value: ethValue })

  //     await xsnx.hedge(['0', '0'], { from: deployerAccount })

  //     const xsnxSupply = await xsnx.totalSupply()
  //     console.log('xsnxSupply', xsnxSupply.toString())
  //     const tokensToBurn = xsnxSupply.div(bn(100))

  //     const snxBalance = await tradeAccounting.getSnxBalance()
  //     console.log('snxBalance', snxBalance.toString())
  //     const debtValue = await tradeAccounting.extGetContractDebtValue()
  //     console.log('debtValue', debtValue.toString())
  //     const nonSnxAssetValue = await tradeAccounting.extCalculateNonSnxAssetValue()
  //     console.log('nonSnxAssetValue', nonSnxAssetValue.toString())
  //     const redeemTokenPrice = await tradeAccounting.extCalculateRedeemTokenPrice(
  //       tokensToBurn.toString(),
  //       xsnxSupply,
  //       snxBalance, // this is correct input val assuming no escrow
  //       debtValue,
  //     )
  //     console.log('redeemTokenPrice', redeemTokenPrice.toString())
  //     const ethBal = await web3.eth.getBalance(xsnx.address)
  //     console.log('ethBal', ethBal.toString())

  //     const valueToRedeem = bn(redeemTokenPrice).mul(tokensToBurn).div(DEC_18)
  //     console.log('valueToRedeem', valueToRedeem.toString())

  //     await xsnx.burn(tokensToBurn, { from: account1 })
  //     assert(true)
  //   })