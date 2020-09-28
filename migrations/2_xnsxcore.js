const migrationInputs = require('../util/migrationInputs');
const xSNXAdmin = artifacts.require('xSNXAdmin');
const xSNX = artifacts.require('xSNX');
const TradeAccounting = artifacts.require('TradeAccounting');

//proxies
const xSNXProxy = artifacts.require('xSNXProxy');
const xSNXAdminProxy = artifacts.require('xSNXAdminProxy');
const TradeAccountingProxy = artifacts.require('TradeAccountingProxy');

// mock version
const ExtXAdmin = artifacts.require('ExtXAdmin');
const ExtTradeAccounting = artifacts.require('ExtTA');

// local env
const MockFeePool = artifacts.require('MockFeePool');
const MockERC20 = artifacts.require('MockERC20');
const MockWETH = artifacts.require('MockWETH');
const MockSUSD = artifacts.require('MockSUSD');
const MockUSDC = artifacts.require('MockUSDC');
const MockLINK = artifacts.require('MockLINK');
const MockSetToken = artifacts.require('MockSetToken');
const MockCollateralSet = artifacts.require('MockCollateralSet');
const MockExchangeRates = artifacts.require('MockExchangeRates');
const MockRewardEscrow = artifacts.require('MockRewardEscrow');
const MockAddressResolver = artifacts.require('MockAddressResolver');
const MockKyberProxy = artifacts.require('MockKyberProxy');
const MockCurveFi = artifacts.require('MockCurveFi');
const MockSynthetix = artifacts.require('MockSynthetix');
const MockRebalancingModule = artifacts.require('MockRebalancingModule');
const MockSynthetixState = artifacts.require('MockSynthetixState');
const MockSystemSettings = artifacts.require('MockSystemSettings');

// ["kovan, mainnet"]
const DEPLOY_TO_NETWORK = 'kovan';

module.exports = async function(deployer, network, accounts) {
	if (network === 'development') {
		const admin = accounts[0];
		const cosigner1 = accounts[7];
		const cosigner2 = accounts[8];

		return deployer.deploy(MockFeePool).then((feePool) => {
			return deployer.deploy(MockExchangeRates).then((exchangeRates) => {
				return deployer.deploy(MockRewardEscrow).then((rewardEscrow) => {
					return deployer.deploy(MockSynthetixState).then((synthetixState) => {
						return deployer.deploy(MockSystemSettings).then((systemSettings) => {
							return deployer.deploy(MockSynthetix).then((synthetix) => {
								synthetix.setRewardEscrowAddress(rewardEscrow.address);
								return deployer
									.deploy(
										MockAddressResolver,
										exchangeRates.address,
										feePool.address,
										rewardEscrow.address,
										synthetixState.address,
										synthetix.address,
										systemSettings.address
									)
									.then(async (addressResolver) => {
										return deployer.deploy(MockWETH).then((weth) => {
											return deployer.deploy(MockUSDC).then((usdc) => {
												return deployer
													.deploy(MockCollateralSet, [weth.address, usdc.address])
													.then((collateralSetToken) => {
														return deployer.deploy(MockSUSD).then(async (susd) => {
															await synthetix.setSusdAddress(susd.address);
															console.log('susd address set on mock synthetix');

															return deployer
																.deploy(
																	MockSetToken,
																	[weth.address, usdc.address],
																	collateralSetToken.address
																)
																.then((setToken) => {
																	const ETH_ADDRESS =
																		'0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
																	return deployer
																		.deploy(
																			MockKyberProxy,
																			ETH_ADDRESS,
																			synthetix.address,
																			susd.address,
																			weth.address,
																			usdc.address
																		)
																		.then((kyberProxy) => {
																			return deployer
																				.deploy(
																					MockRebalancingModule,
																					setToken.address
																				)
																				.then(async (rebalancingModule) => {
																					const synthSymbols = [
																						'sETH',
																						'sUSD',
																					].map((symbol) =>
																						web3.utils.fromAscii(symbol)
																					);
																					const setComponentAddresses = [
																						weth.address,
																						usdc.address,
																					];
																					await rebalancingModule.setWethAddress(
																						weth.address
																					);
																					await rebalancingModule.setUsdcAddress(
																						usdc.address
																					);
																					return deployer
																						.deploy(MockCurveFi)
																						.then(async (curveFi) => {
																							return deployer
																								.deploy(
																									ExtTradeAccounting
																								)
																								.then(
																									async (
																										tradeAccounting
																									) => {
																										let taProxy = await deployer.deploy(
																											TradeAccountingProxy,
																											tradeAccounting.address,
																											admin,
																											cosigner1,
																											cosigner2
																										);
																										let taProxyCast = await ExtTradeAccounting.at(
																											taProxy.address
																										);
																										await taProxyCast.initialize(
																											setToken.address,
																											kyberProxy.address,
																											addressResolver.address,
																											susd.address,
																											usdc.address,
																											accounts[1],
																											synthSymbols,
																											setComponentAddresses,
																											admin
																										);

																										return deployer
																											.deploy(
																												ExtXAdmin
																											)
																											.then(
																												async (
																													xsnxAdmin
																												) => {
																													let xsnxAdminProxy = await deployer.deploy(
																														xSNXAdminProxy,
																														xsnxAdmin.address,
																														admin,
																														cosigner1,
																														cosigner2
																													);
																													let xsnxAdminProxyCast = await ExtXAdmin.at(
																														xsnxAdminProxy.address
																													);
																													await xsnxAdminProxyCast.initialize(
																														taProxyCast.address,
																														setToken.address,
																														synthetix.address,
																														susd.address,
																														susd.address, // used as placeholder for setTransferProxy which isn't used in testing
																														addressResolver.address,
																														rebalancingModule.address,
																														admin
																													);

																													return deployer
																														.deploy(
																															xSNX
																														)
																														.then(
																															async (
																																xsnx
																															) => {
																																let xsnxProxy = await deployer.deploy(
																																	xSNXProxy,
																																	xsnx.address,
																																	admin,
																																	cosigner1,
																																	cosigner2
																																);
																																let xsnxProxyCast = await xSNX.at(
																																	xsnxProxy.address
																																);
																																await xsnxProxyCast.initialize(
																																	taProxyCast.address,
																																	kyberProxy.address,
																																	synthetix.address,
																																	susd.address,
																																	xsnxAdminProxyCast.address,
																																	admin
																																);

																																await xsnxProxyCast.setFeeDivisors(
																																	'400',
																																	'400',
																																	'40'
																																);
																																console.log(
																																	'xsnx: fee divisors set'
																																);

																																await xsnxAdminProxyCast.setXsnxTokenAddress(
																																	xsnxProxy.address
																																);
																																await xsnxAdminProxyCast.approveMock(
																																	rebalancingModule.address,
																																	weth.address
																																);
																																console.log(
																																	'xsnx: weth approved on rebalance module *mock purposes only*'
																																);
																																await xsnxAdminProxyCast.approveMock(
																																	rebalancingModule.address,
																																	usdc.address
																																);
																																console.log(
																																	'xsnx: usdc approved on rebalance module *mock purposes only*'
																																);
																																await xsnxAdminProxyCast.approveMock(
																																	rebalancingModule.address,
																																	setToken.address
																																);
																																console.log(
																																	'xsnx: set token approved on rebalance module *mock purposes only*'
																																);
																																await xsnxAdminProxyCast.approveMock(
																																	synthetix.address,
																																	susd.address
																																);
																																console.log(
																																	'xsnx: susd approved on synthetix *mock purposes only*'
																																);

																																// only testing
																																await feePool.setSusdAddress(
																																	susd.address
																																);

																																await taProxyCast.setAdminInstanceAddress(
																																	xsnxAdminProxyCast.address
																																);
																																console.log(
																																	'ta: caller address set'
																																);

																																await taProxyCast.approveKyber(
																																	synthetix.address
																																);
																																console.log(
																																	'ta: approve kyber: snx'
																																);

																																await taProxyCast.approveKyber(
																																	susd.address
																																);
																																console.log(
																																	'ta: approve kyber: susd'
																																);

																																await taProxyCast.approveKyber(
																																	weth.address
																																);
																																console.log(
																																	'ta: approve kyber: set asset 1'
																																);
																																await taProxyCast.approveKyber(
																																	usdc.address
																																);
																																console.log(
																																	'ta: approve kyber: set asset 2'
																																);
																																const USDC_CURVE_INDEX = 1;
																																const SUSD_CURVE_INDEX = 3;

																																await taProxyCast.setCurve(
																																	curveFi.address,
																																	USDC_CURVE_INDEX,
																																	SUSD_CURVE_INDEX
																																);
																																console.log(
																																	'ta: curve set'
																																);
																																await taProxyCast.approveCurve(
																																	susd.address
																																);
																																console.log(
																																	'ta: approve curve: susd'
																																);
																																await taProxyCast.approveCurve(
																																	usdc.address
																																);
																																console.log(
																																	'ta: approve curve: usdc'
																																);
																																await curveFi.setSusdAddress(
																																	susd.address
																																);
																																await curveFi.setUsdcAddress(
																																	usdc.address
																																);
																															}
																														);
																												}
																											);
																									}
																								);
																						});
																				});
																		});
																});
														});
													});
											});
										});
									});
							});
						});
					});
				});
			});
		});
	}
	// ***********************************************************

	if (network === DEPLOY_TO_NETWORK) {
		console.log(`Deploying to ${network}...`);
		const [owner, user1] = accounts;

		const SET_ADDRESS = migrationInputs['SET_ADDRESS'][network];
		const KYBER_PROXY = migrationInputs['KYBER_PROXY'][network];
		const CURVE_POOL = migrationInputs['CURVE_POOL'][network];

		const SET_ASSET_1 = migrationInputs['SET_ASSET_1'][network];
		const SET_ASSET_2 = migrationInputs['SET_ASSET_2'][network];
		const ADDRESS_RESOLVER = migrationInputs['ADDRESS_RESOLVER'][network];

		const REBALANCING_MODULE = migrationInputs['REBALANCING_MODULE'][network];
		const SUSD_ADDRESS = migrationInputs['SUSD_ADDRESS'][network];
		const SNX_ADDRESS = migrationInputs['SNX_ADDRESS'][network];
		const USDC_ADDRESS = migrationInputs['USDC_ADDRESS'][network];

		const SET_TRANSFER_PROXY = migrationInputs['SET_TRANSFER_PROXY'][network];
		const SYNTH_SYMBOLS = migrationInputs['SYNTH_SYMBOLS'][network].map((s) => web3.utils.fromAscii(s));
		const SET_COMPONENT_ADDRESSES = [SET_ASSET_1, SET_ASSET_2];
		const ADDRESS_VALIDATOR = '0x885583955F14970CbC0046B91297e9915f4DE6E4';
		//address of the owner role
		const OWNER = accounts[0];
		const COSIGNER2 = '0x5314736b4b7778aC25be9afb3819c4ABF4FBEaEA';

		const USDC_CURVE_INDEX = 1;
		const SUSD_CURVE_INDEX = 3;

		return deployer.deploy(TradeAccounting).then((tradeAccountingImpl) => {
			return deployer.deploy(xSNXAdmin).then(async (xsnxAdminImpl) => {
				return deployer.deploy(xSNX).then(async (xsnxImpl) => {
					console.log('tradeAccountingImpl: ', tradeAccountingImpl.address);
					console.log('xsnxAdminImpl: ', xsnxAdminImpl.address);
					console.log('xsnxImpl: ', xsnxImpl.address);
					let taProxy = await deployer.deploy(
						TradeAccountingProxy,
						tradeAccountingImpl.address,
						OWNER,
						ADDRESS_VALIDATOR,
						COSIGNER2
					);
					let xsnxAdminProxy = await deployer.deploy(
						xSNXAdminProxy,
						xsnxAdminImpl.address,
						OWNER,
						ADDRESS_VALIDATOR,
						COSIGNER2
					);
					let xsnxProxy = await deployer.deploy(
						xSNXProxy,
						xsnxImpl.address,
						OWNER,
						ADDRESS_VALIDATOR,
						COSIGNER2
					);
					console.log('taProxy: ', taProxy.address);
					console.log('xsnxAdminProxy: ', xsnxAdminProxy.address);
					console.log('xsnxProxy: ', xsnxProxy.address);

					let taProxyCast = await TradeAccounting.at(taProxy.address);
					await taProxyCast.initialize(
						SET_ADDRESS,
						KYBER_PROXY,
						ADDRESS_RESOLVER,
						SUSD_ADDRESS,
						USDC_ADDRESS,
						ADDRESS_VALIDATOR,
						SYNTH_SYMBOLS,
						SET_COMPONENT_ADDRESSES,
						OWNER
					);
					console.log('ta: proxy configured');
					let xsnxAdminProxyCast = await xSNXAdmin.at(xsnxAdminProxy.address);
					await xsnxAdminProxyCast.initialize(
						taProxyCast.address,
						SET_ADDRESS,
						SNX_ADDRESS,
						SUSD_ADDRESS,
						SET_TRANSFER_PROXY,
						ADDRESS_RESOLVER,
						REBALANCING_MODULE,
						OWNER
					);
					console.log('xsnxAdmin: proxy configured');

					let xsnxProxyCast = await xSNX.at(xsnxProxy.address);
					await xsnxProxyCast.initialize(
						taProxyCast.address,
						KYBER_PROXY,
						SNX_ADDRESS,
						SUSD_ADDRESS,
						xsnxAdminProxyCast.address,
						OWNER
					);

					await xsnxAdminProxyCast.setXsnxTokenAddress(xsnxProxyCast.address);

					await xsnxAdminProxyCast.approveSetTransferProxy(SET_ASSET_1);
					console.log('xsnx: set asset 1 => transfer proxy approve');
					await xsnxAdminProxyCast.approveSetTransferProxy(SET_ASSET_2); 
					console.log('xsnx: set asset 2 => transfer proxy approve');

					await xsnxProxyCast.setFeeDivisors('500', '500', '100'); 
					console.log('xsnx: fee divisors set');

					await taProxyCast.setAdminInstanceAddress(xsnxAdminProxyCast.address);
					console.log('ta: xsnx address set');

					await taProxyCast.setCurve(CURVE_POOL, USDC_CURVE_INDEX, SUSD_CURVE_INDEX);
					console.log('ta: curve set');

					await taProxyCast.approveKyber(SNX_ADDRESS);
					console.log('ta: approve kyber: snx');
					await taProxyCast.approveKyber(SET_ASSET_1); 
					console.log('ta: approve kyber: set asset 1');
					await taProxyCast.approveKyber(SET_ASSET_2);
					console.log('ta: approve kyber: set asset 2');
					await taProxyCast.approveKyber(USDC_ADDRESS); // unnecessary for USDC-Sets
					console.log('ta: approve kyber: usdc');
					await taProxyCast.approveCurve(SUSD_ADDRESS); 
					console.log('ta: approve curve: susd');
					await taProxyCast.approveCurve(USDC_ADDRESS);//
					console.log('ta: approve curve: usdc');
				});
			});
		});
	}
};
