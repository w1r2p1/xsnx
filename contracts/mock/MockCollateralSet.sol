pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockCollateralSet is MockERC20 {
    address activeAsset;

    // [weth, usdc]
    address[] setAssets;

    constructor(address[] memory _setAssets, address _activeAsset) public MockERC20("Collateral Set", "CollateralSet", 18, 1000e18) {
        setAssets = _setAssets;
        activeAsset = _activeAsset;
    }
    function getUnits() public view returns (uint256[] memory units){
        units = new uint[](1);
        // weth
        if(activeAsset == setAssets[0]){
        // usdc
            units[0] = 2097152;
        } else {
            units[0] = 307;
        }
    }
    function naturalUnit() public view returns(uint){
        if(activeAsset == setAssets[0]){
            return 1000000;
        }
        return 1000000000000;
    }
    function getComponents() public view returns(address[] memory components){
        components = new address[](1);
        components[0] = activeAsset;
    }
    function setActiveAsset(uint index) public {
        activeAsset = setAssets[index];
    }
}