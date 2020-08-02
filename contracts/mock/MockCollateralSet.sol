pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockCollateralSet is MockERC20 {
    uint activeAssetIndex = 0;

    // [weth, usdc]
    address[] setAssets;

    constructor(address[] memory _setAssets) public MockERC20("Collateral Set", "CollateralSet", 18, 1000e18) {
        setAssets = _setAssets;
    }
    function getUnits() public view returns (uint256[] memory units){
        units = new uint[](1);
        if(activeAssetIndex == 0){
        // weth
            units[0] = 1577152;
        } else {
        // usdc
            units[0] = 707;
        }
    }
    function naturalUnit() public view returns(uint){
        if(activeAssetIndex == 0){
            return 1000000;
        }
        return 1000000000000;
    }
    function getComponents() public view returns(address[] memory components){
        components = new address[](1);
        components[0] = setAssets[activeAssetIndex];
    }

    function toggleActiveAssetIndex() public {
        if(activeAssetIndex == 0){
            activeAssetIndex = 1;
        } else {
            activeAssetIndex = 0;
        }
    }
}