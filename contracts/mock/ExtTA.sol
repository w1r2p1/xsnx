pragma solidity 0.5.15;

import "../TradeAccounting.sol";

contract ExtTA is TradeAccounting {
    function initialize(
        address setAddress, 
        address kyberProxyAddress, 
        address addressResolverAddress, 
        address susdAddress,
        address usdcAddress,
        address addressValidator,
        bytes32[2] memory synthSymbols, 
        address[2] memory setComponentAddresses,
        address ownerAddress
    ) public initializer {
        TradeAccounting.initialize(
            setAddress, 
            kyberProxyAddress, 
            addressResolverAddress,
            susdAddress,
            usdcAddress,
            addressValidator,
            synthSymbols, 
            setComponentAddresses,
            ownerAddress
        );
    }

    function extGetContractDebtValue() public view returns(uint) {
        return getContractDebtValue();
    }
    function extGetSetUnitShares() public view returns(uint) {
        return getSetUnitShares();
    }
    function extGetSetNaturalUnit() public view returns(uint) {
        return getSetNaturalUnit();
    }
    function extGetCurrentSet() public view returns(address) {
        return getCurrentSet();
    }
    function extGetContractSetBalance() public view returns(uint) {
        return getContractSetBalance();
    }
    function extGetBaseSetComponentUnits() public view returns(uint) {
        return getBaseSetComponentUnits();
    }
    function extGetSetBalanceCollateral() public view returns(uint) {
        return getSetBalanceCollateral();
    }
    function extGetBaseSetNaturalUnit() public view returns(uint) {
        return getBaseSetNaturalUnit();
    }
    function extGetContractSnxValue() public view returns(uint) {
        return getContractSnxValue();
    }
    function extCalculateNetAssetValueOnMint(uint256 weiPerOneSnx, uint256 snxBalanceBefore, uint256 nonSnxAssetValue) public view returns(uint){
        return calculateNetAssetValueOnMint(weiPerOneSnx, snxBalanceBefore, nonSnxAssetValue);
    }
    function extCalculateNetAssetValueOnRedeem(uint256 weiPerOneSnx, uint256 snxBalanceOwned, uint256 contractDebtValue) public view returns(uint){
        return calculateNetAssetValueOnRedeem(weiPerOneSnx, snxBalanceOwned, contractDebtValue);
    }
    function extCalculateNonSnxAssetValue() public view returns(uint){
        return calculateNonSnxAssetValue();
    }
    function extGetSetCollateralTokens() public view returns(uint){
        return getSetCollateralTokens();
    }
    function extCalculateRedeemTokenPrice(uint256 totalSupply, uint256 snxBalanceOwned, uint256 contractDebtValue) public view returns(uint){
        return calculateRedeemTokenPrice(totalSupply, snxBalanceOwned, contractDebtValue);
    }
    function extGetWeiPerOneSnxOnMint() public view returns(uint){
        return getWeiPerOneSnxOnMint();
    }
    function extGetSnxBalanceOwned() public view returns(uint){
        return getSnxBalanceOwned();
    }
    function extCalculateDebtValueInWei(uint debtValue) public view returns(uint){
        return calculateDebtValueInWei(debtValue);
    }
    function extGetIssuanceRatio() public view returns(uint){
        return getIssuanceRatio();
    }
    function extGetContractEscrowedSnxValue() public view returns(uint){
        return getContractEscrowedSnxValue();
    }
    function extGetContractOwnedSnxValue() public view returns(uint){
        return getContractOwnedSnxValue();
    }
    function extCalculateHedgeAssetsValueInUsd() public view returns(uint){
        return calculateHedgeAssetsValueInUsd();
    }
    function extCalculateAssetChangesForRebalanceToHedge() public view returns(uint, uint){
        return calculateAssetChangesForRebalanceToHedge();
    }
    function extETH_TARGET() public view returns(uint){
        return 4;
    }
    function extGetActiveAssetSynthSymbol() public view returns(bytes32){
        return getActiveAssetSynthSymbol();
    }
    function extCalculateSusdToBurnToFixRatio(uint snxValueHeld, uint contractDebtValue, uint issuanceRatio) public view returns(uint){
        return calculateSusdToBurnToFixRatio(snxValueHeld, contractDebtValue, issuanceRatio);
    }
}