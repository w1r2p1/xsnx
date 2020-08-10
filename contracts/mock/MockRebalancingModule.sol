pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockRebalancingModule {
    using SafeMath for uint256;
    address setToken;
    address wethAddress;
    address usdcAddress;

    uint activeAssetIndex = 0; // 0 for WETH, 1 for USDC

    function setWethAddress(address _wethAddress) public {
        wethAddress = _wethAddress;
    }

    function setUsdcAddress(address _usdcAddress) public {
        usdcAddress = _usdcAddress;
    }

    function toggleActiveAssetIndex() public {
        if(activeAssetIndex == 0){
            activeAssetIndex = 1;
        } else {
            activeAssetIndex = 0;
        }
    }

    constructor(address _setToken) public {
        setToken = _setToken;
    }

    function redeemRebalancingSet(
        address _rebalancingSetAddress,
        uint256 _rebalancingSetQuantity,
        bool _keepChangeInVault
    ) public {
        IERC20(_rebalancingSetAddress).transferFrom(msg.sender, address(this), _rebalancingSetQuantity);
        
        if(activeAssetIndex == 0){
            uint wethToSend = _rebalancingSetQuantity.mul(102).div(100);
            // uint wethToSend = _rebalancingSetQuantity.mul(853e15).div(1e18);
            IERC20(wethAddress).transfer(msg.sender, wethToSend);
        } else {
            // account for eth/usd exch rate and usdc 6 decimal pts
            uint usdcToSend = _rebalancingSetQuantity.mul(110).mul(1e6).div(1e18);
            // uint usdcToSend = _rebalancingSetQuantity.mul(853e15).div(1e18).mul(200).mul(1e6).div(1e18);
            IERC20(usdcAddress).transfer(msg.sender, usdcToSend);
        }
    }

    function issueRebalancingSet(
        address _rebalancingSetAddress,
        uint256 _rebalancingSetQuantity,
        bool _keepChangeInVault
    ) public {
        if(activeAssetIndex == 0){
            uint wethToReceive = IERC20(wethAddress).balanceOf(msg.sender);
            IERC20(wethAddress).transferFrom(msg.sender, address(this), wethToReceive);
        } else {
            uint usdcToReceive = IERC20(usdcAddress).balanceOf(msg.sender);
            IERC20(usdcAddress).transferFrom(msg.sender, address(this), usdcToReceive);
        }
        IERC20(setToken).transfer(msg.sender, _rebalancingSetQuantity);
    }
}