pragma solidity 0.5.15;

import "../TradeAccounting.sol";

contract ExtTA is TradeAccounting {
    constructor(address setAddress, bytes32[2] memory synthSymbols, address[2] memory setComponentAddresses) public TradeAccounting(setAddress, synthSymbols, setComponentAddresses) {

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
    function extCalculateNetAssetValueOnMint(uint256 weiPerOneSnx, uint256 snxBalanceBefore) public view returns(uint){
        return calculateNetAssetValueOnMint(weiPerOneSnx, snxBalanceBefore);
    }
    function extCalculateNonSnxAssetValue() public view returns(uint){
        return calculateNonSnxAssetValue();
    }
    function extGetSetCollateralTokens() public view returns(uint){
        return getSetCollateralTokens();
    }
    function extCalculateRedeemTokenPrice(uint256 tokensToRedeem, uint256 totalSupply, uint256 snxBalanceOwned, uint256 contractDebtValue) public view returns(uint){
        return calculateRedeemTokenPrice(tokensToRedeem, totalSupply, snxBalanceOwned, contractDebtValue);
    }
    function extGetWeiPerOneSnx(uint256 snxBalanceBefore, uint ethUsedForSnx) public view returns(uint){
        return getWeiPerOneSnx(snxBalanceBefore, ethUsedForSnx);
    }


}