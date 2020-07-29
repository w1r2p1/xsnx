const migrationInputs = require('../util/migrationInputs')
const ExtXCore = artifacts.require('ExtXC')
const xSNXCore = artifacts.require('xSNXCore')
const TradeAccounting = artifacts.require('TradeAccounting')
// mock version
const ExtTradeAccounting = artifacts.require('ExtTA')

// local env
const MockFeePool = artifacts.require('MockFeePool')
const MockERC20 = artifacts.require('MockERC20')
const MockWETH = artifacts.require('MockWETH')
const MockSUSD = artifacts.require('MockSUSD')
const MockUSDC = artifacts.require('MockUSDC')
const MockLINK = artifacts.require('MockLINK')
const MockSetToken = artifacts.require('MockSetToken')
const MockCollateralSet = artifacts.require('MockCollateralSet')
const MockExchangeRates = artifacts.require('MockExchangeRates')
const MockRewardEscrow = artifacts.require('MockRewardEscrow')
const MockAddressResolver = artifacts.require('MockAddressResolver')
const MockKyberProxy = artifacts.require('MockKyberProxy')
const MockCurveFi = artifacts.require('MockCurveFi')
const MockSynthetix = artifacts.require('MockSynthetix')
const MockRebalancingModule = artifacts.require('MockRebalancingModule')
const MockSynthetixState = artifacts.require('MockSynthetixState')

// ["kovan, mainnet"]
const DEPLOY_TO_NETWORK = 'kovan'

module.exports = async function (deployer, network, accounts) {
  if (network === 'development') {
    return deployer.deploy(MockFeePool).then((feePool) => {
      return deployer.deploy(MockExchangeRates).then((exchangeRates) => {
        return deployer.deploy(MockRewardEscrow).then((rewardEscrow) => {
          return deployer.deploy(MockSynthetixState).then((synthetixState) => {
            return deployer.deploy(MockSynthetix).then((synthetix) => {
              synthetix.setRewardEscrowAddress(rewardEscrow.address)
              return deployer
                .deploy(
                  MockAddressResolver,
                  exchangeRates.address,
                  feePool.address,
                  rewardEscrow.address,
                  synthetixState.address,
                  synthetix.address,
                )
                .then(async (addressResolver) => {
                  return deployer.deploy(MockWETH).then((weth) => {
                    return deployer.deploy(MockUSDC).then((usdc) => {
                      return deployer
                        .deploy(
                          MockCollateralSet,
                          [weth.address, usdc.address],
                          weth.address,
                        )
                        .then((collateralSetToken) => {
                          return deployer
                            .deploy(MockSUSD)
                            .then(async (susd) => {
                              await synthetix.setSusdAddress(susd.address)
                              console.log('susd address set on mock synthetix')

                              return deployer
                                .deploy(
                                  MockSetToken,
                                  [weth.address, usdc.address],
                                  collateralSetToken.address,
                                )
                                .then((setToken) => {
                                  const ETH_ADDRESS =
                                    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
                                  return deployer
                                    .deploy(
                                      MockKyberProxy,
                                      ETH_ADDRESS,
                                      synthetix.address,
                                      susd.address,
                                      weth.address,
                                      usdc.address,
                                    )
                                    .then((kyberProxy) => {
                                      return deployer
                                        .deploy(
                                          MockRebalancingModule,
                                          setToken.address,
                                        )
                                        .then(async (rebalancingModule) => {
                                          const synthSymbols = [
                                            'sETH',
                                            'sUSD',
                                          ].map((symbol) =>
                                            web3.utils.fromAscii(symbol),
                                          )
                                          const setComponentAddresses = [
                                            weth.address,
                                            usdc.address,
                                          ]
                                          await rebalancingModule.setWethAddress(
                                            weth.address,
                                          )
                                          return deployer
                                            .deploy(MockCurveFi)
                                            .then(async (curveFi) => {
                                              return deployer
                                                .deploy(
                                                  ExtTradeAccounting,
                                                  setToken.address,
                                                  kyberProxy.address,
                                                  synthetix.address,
                                                  susd.address,
                                                  usdc.address,
                                                  synthSymbols,
                                                  setComponentAddresses,
                                                )
                                                .then(
                                                  async (tradeAccounting) => {
                                                    return deployer
                                                      .deploy(
                                                        ExtXCore,
                                                        tradeAccounting.address,
                                                        setToken.address,
                                                        synthetix.address,
                                                        susd.address,
                                                      )
                                                      .then(async (xsnx) => {
                                                        console.log(
                                                          'xsnx deployed',
                                                        )
                                                        await xsnx.approveMock(
                                                          rebalancingModule.address,
                                                          weth.address,
                                                        )
                                                        console.log(
                                                          'xsnx: weth approved on rebalance module *mock purposes only*',
                                                        )
                                                        await xsnx.approveMock(
                                                          rebalancingModule.address,
                                                          setToken.address,
                                                        )
                                                        console.log(
                                                          'xsnx: set token approved on rebalance module *mock purposes only*',
                                                        )
                                                        await xsnx.approveMock(
                                                          synthetix.address,
                                                          susd.address,
                                                        )
                                                        console.log(
                                                          'xsnx: susd approved on synthetix *mock purposes only*',
                                                        )
                                                        await xsnx.setAddressResolverAddress(
                                                          addressResolver.address,
                                                        )
                                                        console.log(
                                                          'xsnx: address resolver set',
                                                        )

                                                        await xsnx.setRebalancingSetIssuanceModuleAddress(
                                                          rebalancingModule.address,
                                                        )
                                                        console.log(
                                                          'xsnx: rebalancing mod set',
                                                        )
                                                        await xsnx.approveTradeAccounting(
                                                          susd.address,
                                                        )
                                                        console.log(
                                                          'xsnx: susd => tradeAccounting approve',
                                                        )
                                                        await xsnx.approveTradeAccounting(
                                                          synthetix.address,
                                                        )
                                                        console.log(
                                                          'xsnx: snx => tradeAccounting approve',
                                                        )
                                                        await xsnx.approveTradeAccounting(
                                                          weth.address,
                                                        )
                                                        console.log(
                                                          'xsnx: set asset 1 => tradeAccounting approve',
                                                        )
                                                        await xsnx.approveTradeAccounting(
                                                          usdc.address,
                                                        )
                                                        console.log(
                                                          'xsnx: set asset 2 => tradeAccounting approve',
                                                        )

                                                        // only testing
                                                        await feePool.setSusdAddress(
                                                          susd.address,
                                                        )

                                                        await xsnx.setFeeDivisors(
                                                          '400',
                                                          '400',
                                                          '40',
                                                        )
                                                        console.log(
                                                          'xsnx: fee divisors set',
                                                        )

                                                        await tradeAccounting.setCallerAddress(
                                                          xsnx.address,
                                                        )
                                                        console.log(
                                                          'ta: caller address set',
                                                        )
                                                        await tradeAccounting.setAddressResolverAddress(
                                                          addressResolver.address,
                                                        )
                                                        console.log(
                                                          'ta: address resolver set',
                                                        )

                                                        await tradeAccounting.setSynthetixStateAddress()
                                                        console.log(
                                                          'ta: synth state set',
                                                        )
                                                        await tradeAccounting.setExchangeRatesAddress()
                                                        console.log(
                                                          'ta: exch rates set',
                                                        )

                                                        await tradeAccounting.approveKyber(
                                                          synthetix.address,
                                                        )
                                                        console.log(
                                                          'ta: approve kyber: snx',
                                                        )
                                                        await tradeAccounting.approveKyber(
                                                          susd.address,
                                                        )
                                                        console.log(
                                                          'ta: approve kyber: susd',
                                                        )
                                                        await tradeAccounting.approveKyber(
                                                          weth.address,
                                                        )
                                                        console.log(
                                                          'ta: approve kyber: set asset 1',
                                                        )
                                                        await tradeAccounting.approveKyber(
                                                          usdc.address,
                                                        )
                                                        console.log(
                                                          'ta: approve kyber: set asset 2',
                                                        )
                                                        await tradeAccounting.setCurveAddress(
                                                          curveFi.address,
                                                        )
                                                        console.log(
                                                          'ta: curve set',
                                                        )
                                                        await tradeAccounting.approveCurve(
                                                          susd.address,
                                                        )
                                                        console.log(
                                                          'ta: approve curve: susd',
                                                        )
                                                        await tradeAccounting.approveCurve(
                                                          usdc.address,
                                                        )
                                                        console.log(
                                                          'ta: approve curve: usdc',
                                                        )
                                                        await curveFi.setSusdAddress(susd.address)
                                                        await curveFi.setUsdcAddress(usdc.address)
                                                      })
                                                  },
                                                )
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    })
                  })
                })
            })
          })
        })
      })
    })
  }
  // ***********************************************************

  if (network === DEPLOY_TO_NETWORK) {
    console.log(`Deploying to ${network}...`)
    const [owner, user1] = accounts

    const SET_ADDRESS = migrationInputs['SET_ADDRESS'][network]
    const KYBER_PROXY = migrationInputs['KYBER_PROXY'][network]
    const CURVE_POOL = migrationInputs['CURVE_POOL'][network]

    const SET_ASSET_1 = migrationInputs['SET_ASSET_1'][network]
    const SET_ASSET_2 = migrationInputs['SET_ASSET_2'][network]
    const ADDRESS_RESOLVER = migrationInputs['ADDRESS_RESOLVER'][network]

    const REBALANCING_MODULE = migrationInputs['REBALANCING_MODULE'][network]
    const SUSD_ADDRESS = migrationInputs['SUSD_ADDRESS'][network]
    const SNX_ADDRESS = migrationInputs['SNX_ADDRESS'][network]
    const USDC_ADDRESS = migrationInputs['USDC_ADDRESS'][network]

    const SET_TRANSFER_PROXY = migrationInputs['SET_TRANSFER_PROXY'][network]
    const SYNTH_SYMBOLS = migrationInputs['SYNTH_SYMBOLS'][network].map((s) =>
      web3.utils.fromAscii(s),
    )
    const SET_COMPONENT_ADDRESSES = [SET_ASSET_1, SET_ASSET_2]

    return deployer
      .deploy(
        TradeAccounting,
        SET_ADDRESS,
        KYBER_PROXY,
        SNX_ADDRESS,
        SUSD_ADDRESS,
        USDC_ADDRESS,
        SYNTH_SYMBOLS,
        SET_COMPONENT_ADDRESSES,
      )
      .then((tradeAccounting) => {
        return deployer
          .deploy(
            xSNXCore,
            tradeAccounting.address,
            SET_ADDRESS,
            SNX_ADDRESS,
            SUSD_ADDRESS,
          )
          .then(async (xsnx) => {
            console.log('xsnx deployed')
            await xsnx.setAddressResolverAddress(ADDRESS_RESOLVER)
            console.log('xsnx: address resolver set')
            await xsnx.setRebalancingSetIssuanceModuleAddress(
              REBALANCING_MODULE,
            )
            console.log('xsnx: rebalancing mod set')

            await xsnx.approveTradeAccounting(SUSD_ADDRESS)
            console.log('xsnx: susd => tradeAccounting approve')
            await xsnx.approveTradeAccounting(SNX_ADDRESS)
            console.log('xsnx: snx => tradeAccounting approve')
            await xsnx.approveTradeAccounting(SET_ASSET_1)
            console.log('xsnx: set asset 1 => tradeAccounting approve')
            await xsnx.approveTradeAccounting(SET_ASSET_2)
            console.log('xsnx: set asset 2 => tradeAccounting approve')

            await xsnx.approveSetTransferProxy(SET_ASSET_1, SET_TRANSFER_PROXY)
            console.log('xsnx: set asset 1 => transfer proxy approve')
            await xsnx.approveSetTransferProxy(SET_ASSET_2, SET_TRANSFER_PROXY)
            console.log('xsnx: set asset 2 => transfer proxy approve')

            await xsnx.setFeeDivisors('400', '400', '40')
            console.log('xsnx: fee divisors set')

            await tradeAccounting.setCallerAddress(xsnx.address)
            console.log('ta: caller address set')
            await tradeAccounting.setAddressResolverAddress(ADDRESS_RESOLVER)
            console.log('ta: address resolver set')

            await tradeAccounting.setSynthetixStateAddress()
            console.log('ta: synth state set')
            await tradeAccounting.setExchangeRatesAddress()
            console.log('ta: exch rates set')
            await tradeAccounting.setCurveAddress(CURVE_POOL)
            console.log('ta: curve set') // errored here

            await tradeAccounting.approveKyber(SNX_ADDRESS)
            console.log('ta: approve kyber: snx')
            await tradeAccounting.approveKyber(SUSD_ADDRESS)
            console.log('ta: approve kyber: susd')
            await tradeAccounting.approveKyber(SET_ASSET_1)
            console.log('ta: approve kyber: set asset 1')
            await tradeAccounting.approveKyber(SET_ASSET_2)
            console.log('ta: approve kyber: set asset 2')
            await tradeAccounting.approveKyber(USDC_ADDRESS)
            console.log('ta: approve kyber: usdc')
            await tradeAccounting.approveCurve(SUSD_ADDRESS)
            console.log('ta: approve curve: susd')
            await tradeAccounting.approveCurve(USDC_ADDRESS)
            console.log('ta: approve curve: usdc')
          })
      })
  }
}
