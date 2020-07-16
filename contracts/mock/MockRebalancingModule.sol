pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockRebalancingModule {
    using SafeMath for uint256;
    address setToken;
    address wethAddress;

    function setWethAddress(address _wethAddress) public {
        wethAddress = _wethAddress;
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
        // this redemption calc is a rough approx of the ratio of weth/Set unit implicit 
        // in hard-coded data in MockSetToken and MockCollateralSet
        // essentially 1 WETH gets you a bit less than 1 Set
        uint wethToSend = _rebalancingSetQuantity.mul(853e15).div(1e18); // underlying asset
        IERC20(wethAddress).transfer(msg.sender, wethToSend);
    }

    function issueRebalancingSet(
        address _rebalancingSetAddress,
        uint256 _rebalancingSetQuantity,
        bool _keepChangeInVault
    ) public {
        uint wethToReceive = _rebalancingSetQuantity.mul(853e15).div(1e18);
        IERC20(wethAddress).transferFrom(msg.sender, address(this), wethToReceive);
        IERC20(setToken).transfer(msg.sender, _rebalancingSetQuantity);
    }
}