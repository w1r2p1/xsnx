pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockSetToken is MockERC20 {
    // [weth, usdc]
    address[] setAssets;
    uint activeAssetIndex = 0;

    address collateralSet;

    constructor (address[] memory _setAssets, address _collateralSet) public MockERC20("ETH20SMACO", "ETH20SMACO", 18, 1000e18) {
        setAssets = _setAssets;
        collateralSet = _collateralSet;
    }

    function unitShares() external view returns(uint) {
        // weth
        if(activeAssetIndex == 0){
            return 902151;
        }
        // usdc
        return 402709;
    }
    function naturalUnit() external view returns(uint){
        if(activeAssetIndex == 0){
            return 1000000;
        }
        return 1000000;
    }
    function currentSet() external view returns(address){
        return collateralSet;
    }

    function toggleActiveAssetIndex() public {
        if(activeAssetIndex == 0){
            activeAssetIndex = 1;
        } else {
            activeAssetIndex = 0;
        }
    }
}