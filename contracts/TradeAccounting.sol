pragma solidity 0.5.15;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "synthetix/contracts/interfaces/ISynthetix.sol";
import "synthetix/contracts/interfaces/IRewardEscrow.sol";
import "synthetix/contracts/interfaces/IExchangeRates.sol";
import "synthetix/contracts/interfaces/ISynthetixState.sol";
import "synthetix/contracts/interfaces/IAddressResolver.sol";

// import "./interface/IxSNXCore.sol";
import "./interface/ISystemSettings.sol";

import "./interface/ICurveFi.sol";
import "./interface/ISetToken.sol";
import "./interface/IKyberNetworkProxy.sol";
import "./interface/ISetAssetBaseCollateral.sol";

/* 
	xSNX Target Allocation (assuming 800% C-RATIO)
	----------------------
	Allocation         |  NAV   | % NAV
	--------------------------------------
	800 SNX @ $1/token | $800   | 100%
	100 sUSD Debt	   | ($100)	| (12.5%)
	75 USD equiv Set   | $75    | 9.375%
	25 USD equiv ETH   | $25    | 3.125%
	--------------------------------------
	Total                $800   | 100%   
 */

/* 
	Conditions for `isRebalanceTowardsHedgeRequired` to return true
	Assuming 5% rebalance threshold

	Allocation         |  NAV   | % NAV
	--------------------------------------
	800 SNX @ $1/token | $800   | 100.63%
	105 sUSD Debt	   | ($105)	| (13.21%)
	75 USD equiv Set   | $75    | 9.43%
	25 USD equiv ETH   | $25    | 3.14%
	--------------------------------------
	Total                $795   | 100%   

	Debt value		   | $105
	Hedge Assets	   | $100
	-------------------------
	Debt/hedge ratio   | 105%
  */

/* 
	Conditions for `isRebalanceTowardsSnxRequired` to return true
	Assuming 5% rebalance threshold

	Allocation         |  NAV   | % NAV
	--------------------------------------
	800 SNX @ $1/token | $800   | 99.37%
	100 sUSD Debt	   | ($100)	| (12.42%)
	75 USD equiv Set   | $75    | 9.31%
	30 USD equiv ETH   | $30    | 3.72%
	--------------------------------------
	Total                $805   | 100%   

	Hedge Assets	   | $105
	Debt value		   | $100
	-------------------------
	Hedge/debt ratio   | 105%
  */

contract TradeAccounting is Ownable {
    using SafeMath for uint256;

    uint256 private constant TEN = 10;
    uint256 private constant DEC_18 = 1e18;
    uint256 private constant PERCENT = 100;
    uint256 private constant ETH_TARGET = 4; // targets 1/4th of hedge portfolio
    uint256 private constant SLIPPAGE_RATE = 99;
    uint256 private constant MAX_UINT = 2**256 - 1;
    uint256 private constant RATE_STALE_TIME = 3600; // 1 hour
    uint256 private constant REBALANCE_THRESHOLD = 105; // 5%
    uint256 private constant INITIAL_SUPPLY_MULTIPLIER = 10;

    int128 usdcIndex;
    int128 susdIndex;

    ICurveFi private curveFi;
    ISynthetix private synthetix;
    ISynthetixState private synthetixState;
    IAddressResolver private addressResolver;
    IKyberNetworkProxy private kyberNetworkProxy;

    address private xSNXAdminInstance;
    address private addressValidator;

    address private setAddress;
    address private susdAddress;
    address private usdcAddress;

    address private nextCurveAddress;

    bytes32 constant snx = "SNX";
    bytes32 constant susd = "sUSD";
    bytes32 constant seth = "sETH";

    bytes32[2] synthSymbols;

    address[2] setComponentAddresses;

    function initialize(
        address _setAddress,
        address _kyberProxyAddress,
        address _addressResolver,
        address _susdAddress,
        address _usdcAddress,
        address _addressValidator,
        bytes32[2] memory _synthSymbols,
        address[2] memory _setComponentAddresses,
        address _ownerAddress
    ) public initializer {
        Ownable.initialize(_ownerAddress);

        setAddress = _setAddress;
        kyberNetworkProxy = IKyberNetworkProxy(_kyberProxyAddress);
        addressResolver = IAddressResolver(_addressResolver);
        susdAddress = _susdAddress;
        usdcAddress = _usdcAddress;
        addressValidator = _addressValidator;
        synthSymbols = _synthSymbols;
        setComponentAddresses = _setComponentAddresses;
    }

    modifier onlyXSNXAdmin {
        require(
            msg.sender == xSNXAdminInstance,
            "Only xSNXAdmin contract can call"
        );
        _;
    }

    /* ========================================================================================= */
    /*                                         Kyber                                             */
    /* ========================================================================================= */

    // function swapEtherToToken(address toToken, uint256 minConversionRate)
    //     public
    //     payable
    //     onlyXSNX
    // {
    //     kyberNetworkProxy.swapEtherToToken.value(msg.value)(
    //         ERC20(toToken),
    //         minConversionRate
    //     );
    //     IERC20(toToken).transfer(
    //         xSNXInstance,
    //         IERC20(toToken).balanceOf(address(this))
    //     );
    // }

    function swapTokenToToken(
        address fromToken,
        uint256 amount,
        address toToken,
        uint256 minKyberRate,
        uint256 minCurveReturn
    ) public onlyXSNXAdmin {
        if (fromToken == susdAddress) {
            _exchangeUnderlying(susdIndex, usdcIndex, amount, minCurveReturn);

            if (toToken != usdcAddress) {
                uint256 usdcBal = getUsdcBalance();
                _swapTokenToToken(usdcAddress, usdcBal, toToken, minKyberRate);
            }
        } else if (toToken == susdAddress) {
            if (fromToken != usdcAddress) {
                _swapTokenToToken(fromToken, amount, usdcAddress, minKyberRate);
            }

            uint256 usdcBal = getUsdcBalance();
            _exchangeUnderlying(usdcIndex, susdIndex, usdcBal, minCurveReturn);
        } else {
            _swapTokenToToken(fromToken, amount, toToken, minKyberRate);
        }

        IERC20(toToken).transfer(
            xSNXAdminInstance,
            IERC20(toToken).balanceOf(address(this))
        );
    }

    function _swapTokenToToken(
        address _fromToken,
        uint256 _amount,
        address _toToken,
        uint256 _minKyberRate
    ) private {
        kyberNetworkProxy.swapTokenToToken(
            ERC20(_fromToken),
            _amount,
            ERC20(_toToken),
            _minKyberRate
        );
    }

    function swapTokenToEther(
        address fromToken,
        uint256 amount,
        uint256 minKyberRate,
        uint256 minCurveReturn
    ) public onlyXSNXAdmin {
        if (fromToken == susdAddress) {
            _exchangeUnderlying(susdIndex, usdcIndex, amount, minCurveReturn);

            uint256 usdcBal = getUsdcBalance();
            _swapTokenToEther(usdcAddress, usdcBal, minKyberRate);
        } else {
            _swapTokenToEther(fromToken, amount, minKyberRate);
        }

        uint256 ethBal = address(this).balance;
        (bool success, ) = msg.sender.call.value(ethBal)("");
        require(success, "Transfer failed");
    }

    function _swapTokenToEther(
        address _fromToken,
        uint256 _amount,
        uint256 _minKyberRate
    ) private {
        kyberNetworkProxy.swapTokenToEther(
            ERC20(_fromToken),
            _amount,
            _minKyberRate
        );
    }

    function _exchangeUnderlying(
        int128 _inputIndex,
        int128 _outputIndex,
        uint256 _amount,
        uint256 _minReturn
    ) private {
        curveFi.exchange_underlying(
            _inputIndex,
            _outputIndex,
            _amount,
            _minReturn
        );
    }

    function getUsdcBalance() internal view returns (uint256) {
        return IERC20(usdcAddress).balanceOf(address(this));
    }

    /* ========================================================================================= */
    /*                                          NAV                                              */
    /* ========================================================================================= */

    function getEthBalance() public view returns (uint256) {
        // uint256 withdrawableFees = IxSNXCore(xSNXAdminInstance)
        //     .withdrawableEthFees();
        return address(xSNXAdminInstance).balance; // eth fees now held in token
        // return address(xSNXAdminInstance).balance.sub(withdrawableFees);
    }

    // eth terms
    function calculateRedemptionValue(
        uint256 totalSupply,
        uint256 tokensToRedeem
    ) public view returns (uint256 valueToRedeem) {
        uint256 snxBalanceOwned = getSnxBalanceOwned();
        uint256 contractDebtValue = getContractDebtValue();

        uint256 pricePerToken = calculateRedeemTokenPrice(
            totalSupply,
            snxBalanceOwned,
            contractDebtValue
        );

        valueToRedeem = pricePerToken.mul(tokensToRedeem).div(DEC_18);
    }

    function getMintWithEthUtils(uint256 ethContribution, uint256 totalSupply)
        public
        view
        returns (bool allocateToEth, uint256 nonSnxAssetValue)
    {
        uint256 setHoldingsInWei = getSetHoldingsValueInWei();
        uint256 ethBalBefore = getEthBalance();
        // uint256 ethBalBefore = getEthBalance().sub(ethContribution);

        allocateToEth = shouldAllocateEthToEthReserve(
            setHoldingsInWei,
            ethBalBefore,
            totalSupply
        );
        nonSnxAssetValue = setHoldingsInWei.add(ethBalBefore);
    }

    function shouldAllocateEthToEthReserve(
        uint256 setHoldingsInWei,
        uint256 ethBalBefore,
        uint256 totalSupply
    ) public pure returns (bool allocateToEth) {
        if (totalSupply == 0) return false;

        if (ethBalBefore.mul(ETH_TARGET) < ethBalBefore.add(setHoldingsInWei)) {
            // ETH reserve is under target
            return true;
        }

        return false;
    }

    // eth terms
    function calculateNetAssetValueOnMint(
        uint256 weiPerOneSnx,
        uint256 snxBalanceBefore,
        uint256 nonSnxAssetValue
    ) internal view returns (uint256) {
        uint256 snxTokenValueInWei = snxBalanceBefore.mul(weiPerOneSnx).div(
            DEC_18
        );
        uint256 contractDebtValue = getContractDebtValue();
        uint256 contractDebtValueInWei = calculateDebtValueInWei(
            contractDebtValue
        );
        return
            snxTokenValueInWei.add(nonSnxAssetValue).sub(
                contractDebtValueInWei
            );
    }

    // eth terms
    function calculateNetAssetValueOnRedeem(
        uint256 weiPerOneSnx,
        uint256 snxBalanceOwned,
        uint256 contractDebtValueInWei
    ) internal view returns (uint256) {
        uint256 snxTokenValueInWei = snxBalanceOwned.mul(weiPerOneSnx).div(
            DEC_18
        );
        uint256 nonSnxAssetValue = calculateNonSnxAssetValue();
        return
            snxTokenValueInWei.add(nonSnxAssetValue).sub(
                contractDebtValueInWei
            );
    }

    // eth terms
    function calculateNonSnxAssetValue() internal view returns (uint256) {
        return getSetHoldingsValueInWei().add(getEthBalance());
    }

    function getWeiPerOneSnxOnRedeem()
        internal
        view
        returns (uint256 weiPerOneSnx)
    {
        uint256 snxUsdPrice = getSnxPrice();
        uint256 ethUsdPrice = getSynthPrice(seth);
        weiPerOneSnx = snxUsdPrice
            .mul(DEC_18)
            .div(ethUsdPrice)
            .mul(SLIPPAGE_RATE) // used to better represent liquidation price as volume scales
            .div(PERCENT);
    }

    function getActiveAssetSynthSymbol()
        internal
        view
        returns (bytes32 synthSymbol)
    {
        synthSymbol = getAssetCurrentlyActiveInSet() == setComponentAddresses[0]
            ? (synthSymbols[0])
            : (synthSymbols[1]);
    }

    function getWeiPerOneSnxOnMint() internal view returns (uint256) {
        uint256 snxUsd = getSynthPrice(snx);
        uint256 ethUsd = getSynthPrice(seth);
        return snxUsd.mul(DEC_18).div(ethUsd);
    }

    function getInitialSupply() internal view returns (uint256) {
        return
            IERC20(address(synthetix)).balanceOf(xSNXAdminInstance).mul(
                INITIAL_SUPPLY_MULTIPLIER
            );
    }

    function calculateTokensToMintWithEth(
        uint256 snxBalanceBefore,
        uint256 ethContributed,
        uint256 nonSnxAssetValue,
        uint256 totalSupply,
        bool allocateToEth
    ) public view returns (uint256) {
        if (totalSupply == 0) {
            return getInitialSupply();
        }

        uint256 weiPerOneSnx;
        if (allocateToEth) {
            weiPerOneSnx = getWeiPerOneSnxOnMint();
        } else {
            uint256 snxBalanceAfter = getSnxBalance();
            uint256 snxContributed = snxBalanceAfter.sub(snxBalanceBefore);
            weiPerOneSnx = ethContributed.mul(DEC_18).div(snxContributed);
        }

        uint256 pricePerToken = calculateIssueTokenPrice(
            weiPerOneSnx,
            snxBalanceBefore,
            nonSnxAssetValue,
            totalSupply
        );

        return ethContributed.mul(DEC_18).div(pricePerToken);
    }

    function calculateTokensToMintWithSnx(
        uint256 snxBalanceBefore,
        uint256 snxAddedToBalance,
        uint256 totalSupply
    ) public view returns (uint256) {
        if (totalSupply == 0) {
            return getInitialSupply();
        }

        uint256 weiPerOneSnx = getWeiPerOneSnxOnMint();
        // need to derive snx contribution in eth terms for NAV calc
        uint256 proxyEthContribution = weiPerOneSnx.mul(snxAddedToBalance).div(
            DEC_18
        );
        uint256 nonSnxAssetValue = calculateNonSnxAssetValue();
        uint256 pricePerToken = calculateIssueTokenPrice(
            weiPerOneSnx,
            snxBalanceBefore,
            nonSnxAssetValue,
            totalSupply
        );
        return proxyEthContribution.mul(DEC_18).div(pricePerToken);
    }

    function calculateIssueTokenPrice(
        uint256 weiPerOneSnx,
        uint256 snxBalanceBefore,
        uint256 nonSnxAssetValue,
        uint256 totalSupply
    ) public view returns (uint256 pricePerToken) {
        pricePerToken = calculateNetAssetValueOnMint(
            weiPerOneSnx,
            snxBalanceBefore,
            nonSnxAssetValue
        )
            .mul(DEC_18)
            .div(totalSupply);
    }

    function calculateRedeemTokenPrice(
        uint256 totalSupply,
        uint256 snxBalanceOwned,
        uint256 contractDebtValue
    ) public view returns (uint256 pricePerToken) {
        // SNX won't actually be sold (burns are only distributed in available ETH) but
        // this is a proxy for the return value of SNX that would be sold
        uint256 weiPerOneSnx = getWeiPerOneSnxOnRedeem();

        uint256 debtValueInWei = calculateDebtValueInWei(contractDebtValue);
        pricePerToken = calculateNetAssetValueOnRedeem(
            weiPerOneSnx,
            snxBalanceOwned,
            debtValueInWei
        )
            .mul(DEC_18)
            .div(totalSupply);
    }

    /* ========================================================================================= */
    /*                                          Set                                              */
    /* ========================================================================================= */

    function getActiveSetAssetBalance() public view returns (uint256) {
        return
            IERC20(getAssetCurrentlyActiveInSet()).balanceOf(xSNXAdminInstance);
    }

    function calculateSetQuantity(uint256 componentQuantity)
        public
        view
        returns (uint256 rebalancingSetQuantity)
    {
        uint256 baseSetNaturalUnit = getBaseSetNaturalUnit();
        uint256 baseSetComponentUnits = getBaseSetComponentUnits();
        uint256 baseSetIssuable = componentQuantity.mul(baseSetNaturalUnit).div(
            baseSetComponentUnits
        );

        uint256 rebalancingSetNaturalUnit = getSetNaturalUnit();
        uint256 unitShares = getSetUnitShares();
        rebalancingSetQuantity = baseSetIssuable
            .mul(rebalancingSetNaturalUnit)
            .div(unitShares)
            .mul(99) // ensure sufficient balance in underlying asset
            .div(100)
            .div(rebalancingSetNaturalUnit)
            .mul(rebalancingSetNaturalUnit);
    }

    function calculateSetIssuanceQuantity()
        public
        view
        returns (uint256 rebalancingSetIssuable)
    {
        uint256 componentQuantity = getActiveSetAssetBalance();
        rebalancingSetIssuable = calculateSetQuantity(componentQuantity);
    }

    function calculateSetRedemptionQuantity(uint256 totalSusdToBurn)
        public
        view
        returns (uint256 rebalancingSetRedeemable)
    {
        address currentSetAsset = getAssetCurrentlyActiveInSet();

        bytes32 activeAssetSynthSymbol = getActiveAssetSynthSymbol();
        uint256 synthUsd = getSynthPrice(activeAssetSynthSymbol);

        // expectedSetAssetRate = amount of current set asset needed to redeem for 1 sUSD
        uint256 expectedSetAssetRate = DEC_18.mul(DEC_18).div(synthUsd);

        uint256 setAssetCollateralToSell = expectedSetAssetRate
            .mul(totalSusdToBurn)
            .div(DEC_18)
            .mul(103) // err on the high side
            .div(PERCENT);

        uint256 decimals = (TEN**ERC20Detailed(currentSetAsset).decimals());
        setAssetCollateralToSell = setAssetCollateralToSell.mul(decimals).div(
            DEC_18
        );

        rebalancingSetRedeemable = calculateSetQuantity(
            setAssetCollateralToSell
        );
    }

    function calculateEthValueOfOneSetUnit()
        internal
        view
        returns (uint256 ethValue)
    {
        uint256 unitShares = getSetUnitShares();
        uint256 rebalancingSetNaturalUnit = getSetNaturalUnit();
        uint256 baseSetRequired = DEC_18.mul(unitShares).div(
            rebalancingSetNaturalUnit
        );

        uint256 unitsOfUnderlying = getBaseSetComponentUnits();
        uint256 baseSetNaturalUnit = getBaseSetNaturalUnit();
        uint256 componentRequired = baseSetRequired.mul(unitsOfUnderlying).div(
            baseSetNaturalUnit
        );

        address currentSetAsset = getAssetCurrentlyActiveInSet();
        uint256 decimals = (TEN**ERC20Detailed(currentSetAsset).decimals());
        componentRequired = componentRequired.mul(DEC_18).div(decimals);

        bytes32 activeAssetSynthSymbol = getActiveAssetSynthSymbol();

        uint256 synthUsd = getSynthPrice(activeAssetSynthSymbol);
        uint256 ethUsd = getSynthPrice(seth);
        ethValue = componentRequired.mul(synthUsd).div(ethUsd);
    }

    function getSetHoldingsValueInWei()
        public
        view
        returns (uint256 setValInWei)
    {
        uint256 setCollateralTokens = getSetCollateralTokens();
        bytes32 synthSymbol = getActiveAssetSynthSymbol();
        address currentSetAsset = getAssetCurrentlyActiveInSet();

        uint256 synthUsd = getSynthPrice(synthSymbol);
        uint256 ethUsd = getSynthPrice(seth);

        uint256 decimals = (TEN**ERC20Detailed(currentSetAsset).decimals());
        setCollateralTokens = setCollateralTokens.mul(DEC_18).div(decimals);
        setValInWei = setCollateralTokens.mul(synthUsd).div(ethUsd);
    }

    function getBaseSetNaturalUnit() internal view returns (uint256) {
        return getCurrentCollateralSet().naturalUnit();
    }

    function getAssetCurrentlyActiveInSet() public view returns (address) {
        address[] memory currentAllocation = getCurrentCollateralSet()
            .getComponents();
        return currentAllocation[0];
    }

    function getCurrentCollateralSet()
        internal
        view
        returns (ISetAssetBaseCollateral)
    {
        return ISetAssetBaseCollateral(getCurrentSet());
    }

    function getCurrentSet() internal view returns (address) {
        return ISetToken(setAddress).currentSet();
    }

    // this returns the number of underlying tokens in the current Set asset
    // e.g., the contract's Set holdings are collateralized by 10.4 WETH
    function getSetCollateralTokens() internal view returns (uint256) {
        return
            getSetBalanceCollateral().mul(getBaseSetComponentUnits()).div(
                getBaseSetNaturalUnit()
            );
    }

    function getSetBalanceCollateral() internal view returns (uint256) {
        uint256 unitShares = getSetUnitShares();
        uint256 naturalUnit = getSetNaturalUnit();
        return getContractSetBalance().mul(unitShares).div(naturalUnit);
    }

    function getSetUnitShares() internal view returns (uint256) {
        return ISetToken(setAddress).unitShares();
    }

    function getSetNaturalUnit() internal view returns (uint256) {
        return ISetToken(setAddress).naturalUnit();
    }

    function getContractSetBalance() internal view returns (uint256) {
        return IERC20(setAddress).balanceOf(xSNXAdminInstance);
    }

    function getBaseSetComponentUnits() internal view returns (uint256) {
        return ISetAssetBaseCollateral(getCurrentSet()).getUnits()[0];
    }

    /* ========================================================================================= */
    /*                                         Synthetix	                                     */
    /* ========================================================================================= */

    function getSusdBalance() public view returns (uint256) {
        // **fees now transferred to token contract
        return IERC20(susdAddress).balanceOf(xSNXAdminInstance);
        // uint256 susdBal = IERC20(susdAddress).balanceOf(xSNXAdminInstance);
        // uint256 susdFees = IxSNXCore(xSNXInstance).withdrawableSusdFees();
        // return susdBal.sub(susdFees);
    }

    function getSnxBalance() public view returns (uint256) {
        return getSnxBalanceOwned().add(getSnxBalanceEscrowed());
    }

    function getSnxBalanceOwned() internal view returns (uint256) {
        return IERC20(address(synthetix)).balanceOf(xSNXAdminInstance);
    }

    function getSnxBalanceEscrowed() internal view returns (uint256) {
        return
            IRewardEscrow(addressResolver.getAddress(rewardEscrowName))
                .balanceOf(xSNXAdminInstance);
    }

    function getContractEscrowedSnxValue() internal view returns (uint256) {
        return getSnxBalanceEscrowed().mul(getSnxPrice()).div(DEC_18);
    }

    function getContractOwnedSnxValue() internal view returns (uint256) {
        return getSnxBalanceOwned().mul(getSnxPrice()).div(DEC_18);
    }

    function getSnxPrice() internal view returns (uint256) {
        (uint256 rate, uint256 time) = IExchangeRates(
            addressResolver.getAddress(exchangeRatesName)
        )
            .rateAndUpdatedTime(snx);
        require(time.add(RATE_STALE_TIME) > block.timestamp, "Rate stale");
        return rate;
    }

    function getSynthPrice(bytes32 synth) internal view returns (uint256) {
        (uint256 rate, uint256 time) = IExchangeRates(
            addressResolver.getAddress(exchangeRatesName)
        )
            .rateAndUpdatedTime(synth);
        if (synth != susd) {
            require(time.add(RATE_STALE_TIME) > block.timestamp, "Rate stale");
        }
        return rate;
    }

    function calculateDebtValueInWei(uint256 debtValue)
        internal
        view
        returns (uint256 debtBalanceInWei)
    {
        uint256 ethUsd = getSynthPrice(seth);
        debtBalanceInWei = debtValue.mul(DEC_18).div(ethUsd);
    }

    function getContractDebtValue() internal view returns (uint256) {
        return synthetix.debtBalanceOf(xSNXAdminInstance, susd);
    }

    // returns inverse of target C-RATIO
    function getIssuanceRatio() internal view returns (uint256) {
        return
            ISystemSettings(addressResolver.getAddress(systemSettingsName))
                .issuanceRatio();
    }

    // usd terms
    function getContractSnxValue() internal view returns (uint256) {
        return getSnxBalance().mul(getSnxPrice()).div(DEC_18);
    }

    /* ========================================================================================= */
    /*                                       Burning sUSD                                        */
    /* ========================================================================================= */

    function calculateSusdToBurnToFixRatio(
        uint256 snxValueHeld,
        uint256 contractDebtValue,
        uint256 issuanceRatio
    ) internal pure returns (uint256) {
        uint256 subtractor = issuanceRatio.mul(snxValueHeld).div(DEC_18);

        if (subtractor > contractDebtValue) return 0;
        return contractDebtValue.sub(subtractor);
    }

    function calculateSusdToBurnToFixRatioExternal()
        public
        view
        returns (uint256)
    {
        uint256 snxValueHeld = getContractSnxValue();
        uint256 debtValue = getContractDebtValue();
        uint256 issuanceRatio = getIssuanceRatio();
        return
            calculateSusdToBurnToFixRatio(
                snxValueHeld,
                debtValue,
                issuanceRatio
            );
    }

    function calculateSusdToBurnToEclipseEscrowed(uint256 issuanceRatio)
        public
        view
        returns (uint256)
    {
        uint256 escrowedSnxValue = getContractEscrowedSnxValue();
        if (escrowedSnxValue == 0) return 0;

        return escrowedSnxValue.mul(issuanceRatio).div(DEC_18);
    }

    function calculateSusdToBurnForRedemption(
        uint256 tokensToRedeem,
        uint256 totalSupply,
        uint256 contractDebtValue,
        uint256 issuanceRatio
    ) public view returns (uint256 susdToBurn) {
        uint256 nonEscrowedSnxValue = getContractOwnedSnxValue();
        uint256 lockedSnxValue = contractDebtValue.mul(DEC_18).div(
            issuanceRatio
        );
        uint256 valueOfSnxToSell = nonEscrowedSnxValue.mul(tokensToRedeem).div(
            totalSupply
        );
        susdToBurn = (
            lockedSnxValue.add(valueOfSnxToSell).sub(nonEscrowedSnxValue)
        )
            .mul(issuanceRatio)
            .div(DEC_18);
    }

    /* ========================================================================================= */
    /*                                        Rebalances                                         */
    /* ========================================================================================= */

    // usd terms
    function calculateAssetChangesForRebalanceToHedge()
        internal
        view
        returns (uint256 totalSusdToBurn, uint256 snxToSell)
    {
        uint256 snxValueHeld = getContractSnxValue();
        uint256 debtValueInUsd = getContractDebtValue();
        uint256 issuanceRatio = getIssuanceRatio();

        uint256 susdToBurnToFixRatio = calculateSusdToBurnToFixRatio(
            snxValueHeld,
            debtValueInUsd,
            issuanceRatio
        );


            uint256 susdToBurnToEclipseEscrowed
         = calculateSusdToBurnToEclipseEscrowed(issuanceRatio);

        uint256 hedgeAssetsValueInUsd = calculateHedgeAssetsValueInUsd();
        uint256 valueToUnlockInUsd = debtValueInUsd.sub(hedgeAssetsValueInUsd);

        uint256 susdToBurnToUnlockTransfer = valueToUnlockInUsd
            .mul(issuanceRatio)
            .div(DEC_18);

        totalSusdToBurn = (
            susdToBurnToFixRatio.add(susdToBurnToEclipseEscrowed).add(
                susdToBurnToUnlockTransfer
            )
        );
        snxToSell = valueToUnlockInUsd.mul(DEC_18).div(getSnxPrice());
    }

    function calculateAssetChangesForRebalanceToSnx()
        public
        view
        returns (uint256 setToSell)
    {
        (
            uint256 debtValueInWei,
            uint256 hedgeAssetsBalance
        ) = getRebalanceUtils();
        uint256 setValueToSell = hedgeAssetsBalance.sub(debtValueInWei);
        uint256 ethValueOfOneSet = calculateEthValueOfOneSetUnit();
        setToSell = setValueToSell.mul(DEC_18).div(ethValueOfOneSet);

        // Set quantity must be multiple of natural unit
        uint256 naturalUnit = getSetNaturalUnit();
        setToSell = setToSell.div(naturalUnit).mul(naturalUnit);
    }

    function getRebalanceTowardsSnxUtils()
        public
        view
        returns (uint256 setToSell, address activeAsset)
    {
        setToSell = calculateAssetChangesForRebalanceToSnx();
        activeAsset = getAssetCurrentlyActiveInSet();
    }

    // eth terms
    function getRebalanceUtils()
        public
        view
        returns (uint256 debtValueInWei, uint256 hedgeAssetsBalance)
    {
        uint256 setHoldingsInWei = getSetHoldingsValueInWei();
        uint256 ethBalance = getEthBalance();

        uint256 debtValue = getContractDebtValue();
        debtValueInWei = calculateDebtValueInWei(debtValue);
        hedgeAssetsBalance = setHoldingsInWei.add(ethBalance);
    }

    // usd terms
    function calculateHedgeAssetsValueInUsd()
        internal
        view
        returns (uint256 hedgeAssetsValueInUsd)
    {
        address currentSetAsset = getAssetCurrentlyActiveInSet();
        uint256 decimals = (TEN**ERC20Detailed(currentSetAsset).decimals());
        uint256 setCollateralTokens = getSetCollateralTokens();
        setCollateralTokens = setCollateralTokens.mul(DEC_18).div(decimals);

        bytes32 activeAssetSynthSymbol = getActiveAssetSynthSymbol();

        uint256 synthUsd = getSynthPrice(activeAssetSynthSymbol);
        uint256 setValueUsd = setCollateralTokens.mul(synthUsd).div(DEC_18);

        uint256 ethBalance = getEthBalance();
        uint256 ethUsd = getSynthPrice(seth);
        uint256 ethValueUsd = ethBalance.mul(ethUsd).div(DEC_18);

        hedgeAssetsValueInUsd = setValueUsd.add(ethValueUsd);
    }

    function isRebalanceTowardsSnxRequired() public view returns (bool) {
        (
            uint256 debtValueInWei,
            uint256 hedgeAssetsBalance
        ) = getRebalanceUtils();

        if (
            debtValueInWei.mul(REBALANCE_THRESHOLD).div(PERCENT) <
            hedgeAssetsBalance
        ) {
            return true;
        }

        return false;
    }

    function isRebalanceTowardsHedgeRequired() public view returns (bool) {
        (
            uint256 debtValueInWei,
            uint256 hedgeAssetsBalance
        ) = getRebalanceUtils();

        if (
            hedgeAssetsBalance.mul(REBALANCE_THRESHOLD).div(PERCENT) <
            debtValueInWei
        ) {
            return true;
        }

        return false;
    }

    // will fail if !isRebalanceTowardsHedgeRequired()
    function getRebalanceTowardsHedgeUtils()
        public
        view
        returns (
            uint256,
            uint256,
            address
        )
    {
        (
            uint256 totalSusdToBurn,
            uint256 snxToSell
        ) = calculateAssetChangesForRebalanceToHedge();
        address activeAsset = getAssetCurrentlyActiveInSet();
        return (totalSusdToBurn, snxToSell, activeAsset);
    }

    /*
     * @notice Helper for `hedge` function
     * @dev Determines share of sUSD to allocate to ETH
     * @dev Implicitly determines Set allocation as well
     * @param susdBal: sUSD balance post minting
     */
    function getEthAllocationOnHedge(uint256 susdBal)
        public
        view
        returns (uint256 ethAllocation)
    {
        uint256 ethUsd = getSynthPrice(seth);

        uint256 setHoldingsInUsd = getSetHoldingsValueInWei().mul(ethUsd).div(
            DEC_18
        );
        uint256 ethBalInUsd = getEthBalance().mul(ethUsd).div(DEC_18);
        uint256 hedgeAssets = setHoldingsInUsd.add(ethBalInUsd);

        if (ethBalInUsd.mul(ETH_TARGET) >= hedgeAssets.add(susdBal)) {
            // full bal directed toward Set
            // eth allocation is 0
        } else if ((ethBalInUsd.add(susdBal)).mul(ETH_TARGET) < hedgeAssets) {
            // full bal directed toward Eth
            ethAllocation = susdBal;
        } else {
            // fractionate allocation
            ethAllocation = ((hedgeAssets.add(susdBal)).div(ETH_TARGET)).sub(
                ethBalInUsd
            );
        }
    }

    // helper callable when eth bal is below eth target
    function calculateSetToSellForRebalanceSetToEth()
        public
        view
        returns (uint256 setQuantityToSell)
    {
        uint256 setHoldingsInWei = getSetHoldingsValueInWei();
        uint256 ethBal = getEthBalance();
        uint256 hedgeAssets = setHoldingsInWei.add(ethBal);
        require(
            ethBal.mul(ETH_TARGET) < hedgeAssets,
            "Rebalance not necessary"
        );

        // overcompensates slightly leading to more eth than target
        uint256 ethToAdd = ((hedgeAssets.div(ETH_TARGET)).sub(ethBal));
        setQuantityToSell = getContractSetBalance().mul(ethToAdd).div(
            setHoldingsInWei
        );

        uint256 naturalUnit = getSetNaturalUnit();
        setQuantityToSell = setQuantityToSell.div(naturalUnit).mul(naturalUnit);
    }

    /* ========================================================================================= */
    /*                                     Address Setters                                       */
    /* ========================================================================================= */

    bytes32 constant rewardEscrowName = "RewardEscrow";
    bytes32 constant synthetixStateName = "SynthetixState";
    bytes32 constant exchangeRatesName = "ExchangeRates";
    bytes32 constant synthetixName = "Synthetix";
    bytes32 constant systemSettingsName = "SystemSettings";

    function setSynthetixStateAddress() public {
        address synthetixStateAddress = addressResolver.getAddress(
            synthetixStateName
        );
        synthetixState = ISynthetixState(synthetixStateAddress);
    }

    function setSynthetixAddress() public {
        address synthetixAddress = addressResolver.getAddress(synthetixName);
        synthetix = ISynthetix(synthetixAddress);
    }

    function setAdminInstanceAddress(address _xSNXAdminInstance)
        public
        onlyOwner
    {
        if (xSNXAdminInstance == address(0)) {
            xSNXAdminInstance = _xSNXAdminInstance;
        }
    }

    function setCurve(
        address curvePoolAddress,
        int128 _usdcIndex,
        int128 _susdIndex
    ) public onlyOwner {
        if (address(curveFi) == address(0)) {
            // if initial set on deployment, immediately activate Curve address
            curveFi = ICurveFi(curvePoolAddress);
        } else {
            // if updating Curve address (i.e., not initial setting of address on deployment),
            // store nextCurveAddress but don't activate until addressValidator has confirmed
            nextCurveAddress = curvePoolAddress;
        }
        usdcIndex = _usdcIndex;
        susdIndex = _susdIndex;
    }

    /* ========================================================================================= */
    /*                                   		 Utils           		                         */
    /* ========================================================================================= */

    // admin on deployment approve [snx, susd, setComponentA, setComponentB]
    function approveKyber(address tokenAddress) public onlyOwner {
        IERC20(tokenAddress).approve(address(kyberNetworkProxy), MAX_UINT);
    }

    // admin on deployment approve [susd, usdc]
    function approveCurve(address tokenAddress) public onlyOwner {
        IERC20(tokenAddress).approve(address(curveFi), MAX_UINT);
    }

    function confirmCurveAddress(address _nextCurveAddress) public {
        require(msg.sender == addressValidator, "Incorrect caller");
        require(nextCurveAddress == _nextCurveAddress, "Addresses don't match");
        curveFi = ICurveFi(nextCurveAddress);
    }

    function() external payable {}
}
