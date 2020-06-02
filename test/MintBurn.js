const { BN } = require('@openzeppelin/test-helpers')
const { assertBNEqual, BN_ZERO } = require('./utils')
const truffleAssert = require('truffle-assertions')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockSUSD = artifacts.require('MockSUSD')
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
    setToken = await MockSetToken.deployed()
    rebalancingModule = await MockRebalancingModule.deployed()
  })


  describe('Minting and burning xSNX tokens', async () => {
    it('should revert if no ETH is sent', async () => {
      await truffleAssert.reverts(
        xsnx._mint(0, { value: 0, from: account1 }),
        'Must send ETH',
      )
    })

    it('should revert if contract is paused', async () => {
      await xsnx.pause({ from: deployerAccount })
      await truffleAssert.reverts(
        xsnx._mint(0, { value: web3.utils.toWei('1'), from: account1 }),
        'Pausable: paused',
      )
    })

    it('should buy SNX with ETH', async () => {
      await xsnx.unpause({ from: deployerAccount })
      await synthetix.transfer(kyberProxy.address, web3.utils.toWei('100'), {
        from: deployerAccount,
      })
      await xsnx._mint(0, { value: ethValue, from: account1 })

      const xsnxBalSnx = await synthetix.balanceOf(xsnx.address)
      assert.equal(xsnxBalSnx.gt(BN_ZERO), true)
    })

    it('should issue xSNX token to minter', async () => {
      const xsnxBal = await xsnx.balanceOf(account1)
      assert.equal(xsnxBal.gt(BN_ZERO), true)
    })

    it('should charge an ETH fee on mint equal to fee divisor', async () => {
      const feeDivisor = new BN(286)
      const withdrawableFees = await xsnx.withdrawableEthFees()
      const ethValueBN = new BN(ethValue)
      assertBNEqual(withdrawableFees, ethValueBN.div(feeDivisor))
    })

    it('should burn tokens up to the redemption value equivalent of ETH balance', async () => {
      await synthetix.setSusdAddress(susd.address)
      await susd.transfer(synthetix.address, web3.utils.toWei('10'))
      await web3.eth.sendTransaction({
        from: deployerAccount,
        value: web3.utils.toWei('5'),
        to: kyberProxy.address,
      })
      await setToken.transfer(rebalancingModule.address, web3.utils.toWei('2'))
      await xsnx.hedge({ from: account1 });
      
      const xsnxSupply = await xsnx.totalSupply();
      const tokensToBurn = xsnxSupply.div((new BN(1000)));

      await xsnx._burn(tokensToBurn, { from: account1 });
      assert(true);
    })
  })
})
