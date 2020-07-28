const { BN } = require('@openzeppelin/test-helpers')
const truffleAssert = require('truffle-assertions')
const { assertBNEqual, BN_ZERO, ETH_ADDRESS, bn, DEC_18 } = require('./utils')
const xSNXCore = artifacts.require('ExtXC')
const TradeAccounting = artifacts.require('ExtTA')
const MockAddressResolver = artifacts.require('MockAddressResolver')
const MockSUSD = artifacts.require('MockSUSD')
const MockWETH = artifacts.require('MockWETH')
const MockUSDC = artifacts.require('MockUSDC')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockSetToken = artifacts.require('MockSetToken')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')
const MockFeePool = artifacts.require('MockFeePool')
const MockCurveFi = artifacts.require('MockCurveFi')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')

contract(
  'xSNXCore, TradeAccounting: Address Setters and Utils',
  async (accounts) => {
    const [deployer, account1] = accounts
    before(async () => {
      xsnx = await xSNXCore.deployed()
      addressResolver = await MockAddressResolver.deployed()
      susd = await MockSUSD.deployed()
      synthetix = await MockSynthetix.deployed()
      rebalancingModule = await MockRebalancingModule.deployed()
      tradeAccounting = await TradeAccounting.deployed()
      weth = await MockWETH.deployed()
      usdc = await MockUSDC.deployed()
      kyberProxy = await MockKyberProxy.deployed()
      rewardEscrow = await MockRewardEscrow.deployed()
      setToken = await MockSetToken.deployed()
      rewardEscrow = await MockRewardEscrow.deployed()
      feePool = await MockFeePool.deployed()
      curve = await MockCurveFi.deployed()
    })

    describe('Address Setters', async () => {
      // setters executed in deployment script
      // but difficult to test private variable setters directly
      it('should be able to set the address resolver address', async () => {
        await xsnx.setAddressResolverAddress(addressResolver.address)
        assert(true)
      })

      it('should be able to set the rebalancing module address on xSNX', async () => {
        await xsnx.setRebalancingSetIssuanceModuleAddress(
          rebalancingModule.address,
        )
        assert(true)
      })

      it('should be able to set the rebalancing module address on TradeAccounting', async () => {
        await tradeAccounting.setAddressResolverAddress(addressResolver.address)
        assert(true)
      })

      it('should be able to set the Synthetix State address on TradeAccounting', async () => {
        await tradeAccounting.setSynthetixStateAddress()
        assert(true)
      })

      it('should be able to set the xSNX address on TradeAccounting', async () => {
        await tradeAccounting.setCallerAddress(xsnx.address)
        assert(true)
      })

      it('should be able to set the Exchange Rates address on TradeAccounting', async () => {
        await tradeAccounting.setExchangeRatesAddress()
        assert(true)
      })
    })

    describe('ERC20 approvals', async () => {
      // approves executed in deployment script
      it('should approve TradeAccounting to spend SNX belonging to xSNX', async () => {
        const approved = await synthetix.allowance(
          xsnx.address,
          tradeAccounting.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve TradeAccounting to spend sUSD belonging to xSNX', async () => {
        const approved = await susd.allowance(
          xsnx.address,
          tradeAccounting.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve TradeAccounting to spend Set Asset #1 belonging to xSNX', async () => {
        const approved = await weth.allowance(
          xsnx.address,
          tradeAccounting.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve TradeAccounting to spend Set Asset #2 belonging to xSNX', async () => {
        const approved = await usdc.allowance(
          xsnx.address,
          tradeAccounting.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve Kyber to spend SNX belonging to TradeAccounting', async () => {
        const approved = await synthetix.allowance(
          tradeAccounting.address,
          kyberProxy.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve Kyber to spend sUSD belonging to TradeAccounting', async () => {
        const approved = await susd.allowance(
          tradeAccounting.address,
          kyberProxy.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve Kyber to spend Set Asset #1 belonging to TradeAccounting', async () => {
        const approved = await weth.allowance(
          tradeAccounting.address,
          kyberProxy.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve Kyber to spend Set Asset #2 belonging to TradeAccounting', async () => {
        const approved = await usdc.allowance(
          tradeAccounting.address,
          kyberProxy.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      // this may be redundant depending on if USDC is one of the Set Assets
      // USDC will need to be approved either way
      it('should approve Kyber to spend USDC belonging to TradeAccounting', async () => {
        const approved = await usdc.allowance(
          tradeAccounting.address,
          kyberProxy.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve Curve to spend sUSD belonging to TradeAccounting', async () => {
        const approved = await susd.allowance(
          tradeAccounting.address,
          curve.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })

      it('should approve Curve to spend USDC belonging to TradeAccounting', async () => {
        const approved = await usdc.allowance(
          tradeAccounting.address,
          curve.address,
        )
        assert.equal(approved.gt(BN_ZERO), true)
      })
    })

    describe('Vesting', async () => {
      it('should revert if there is no vested balance on the reward escrow contract', async () => {
        await truffleAssert.reverts(xsnx.vest(), 'No vesting rewards available')
      })

      it('should result in greater SNX balance in the contract if executed successfully', async () => {
        const snxBalanceBefore = await tradeAccounting.getSnxBalance()
        await synthetix.transfer(rewardEscrow.address, web3.utils.toWei('2'))
        await rewardEscrow.setSnxAddress(synthetix.address)
        await rewardEscrow.setVestedBalance(web3.utils.toWei('1'))
        await xsnx.vest()
        const snxBalanceAfter = await tradeAccounting.getSnxBalance()

        assertBNEqual(bn(snxBalanceAfter).gt(bn(snxBalanceBefore)), true)
      })
    })

    describe('Collecting Fees', async () => {
      it('should revert if called by non-owner', async () => {
        await truffleAssert.reverts(xsnx.withdrawFees({ from: account1 }))
      })

      it('should result in incremental ETH and sUSD in admin wallet', async () => {
        await setToken.transfer(
          rebalancingModule.address,
          web3.utils.toWei('20'),
        )
        await web3.eth.sendTransaction({
          from: deployer,
          value: web3.utils.toWei('1'),
          to: kyberProxy.address,
        })
        await susd.transfer(synthetix.address, web3.utils.toWei('1000'))
        await weth.transfer(kyberProxy.address, web3.utils.toWei('60'))
        await weth.transfer(rebalancingModule.address, web3.utils.toWei('60'))
        await synthetix.transfer(kyberProxy.address, web3.utils.toWei('1000'))
        await susd.transfer(feePool.address, web3.utils.toWei('20'))
        await susd.transfer(curve.address, web3.utils.toWei('100'))
        await usdc.transfer(curve.address, web3.utils.toWei('100'))

        await xsnx.mint(0, { value: web3.utils.toWei('0.01') })
        const activeAsset = await tradeAccounting.getAssetCurrentlyActiveInSet()
        const snxValueHeld = await tradeAccounting.extGetContractSnxValue()
        const amountSusd = bn(snxValueHeld).div(bn(8)) // 800% c-ratio
        const ethAllocation = await tradeAccounting.getEthAllocationOnHedge(
          amountSusd,
        )

        await xsnx.hedge(
          amountSusd,
          ['0', '0'],
          ['0', '0'],
          activeAsset,
          ethAllocation,
        )

        await xsnx.claim(0, [0, 0], [0,0], true)

        const contractEthBalBefore = await web3.eth.getBalance(xsnx.address)
        const susdBalBefore = await susd.balanceOf(deployer)

        await xsnx.withdrawFees()

        const contractEthBalAfter = await web3.eth.getBalance(xsnx.address)
        const susdBalAfter = await susd.balanceOf(deployer)

        // testing that the contract dispenses ETH
        // instead of testing that the admin account earns more ETH
        // because gas expense will reduce admin ETH balance and distort test
        assertBNEqual(
          bn(contractEthBalBefore).gt(bn(contractEthBalAfter)),
          true,
        )
        assertBNEqual(bn(susdBalAfter).gt(bn(susdBalBefore)), true)
      })
    })

    describe('Whitelisting addresses from fees', async () => {
      it('should be able to exempt a user from mint/burn fees', async () => {
        await tradeAccounting.addToWhitelist(account1)

        const ethPayable = web3.utils.toWei('0.01')
        const ethSnxRate = bn(200)
        const expectedSnxBought = bn(ethPayable).mul(ethSnxRate) // no fee extracted
        const snxBalanceBefore = await tradeAccounting.getSnxBalance()
        await xsnx.mint('0', { value: ethPayable, from: account1 })
        const snxBalanceAfter = await tradeAccounting.getSnxBalance()

        assertBNEqual(
          bn(snxBalanceAfter),
          bn(snxBalanceBefore).add(expectedSnxBought),
        )
      })
    })
  },
)
