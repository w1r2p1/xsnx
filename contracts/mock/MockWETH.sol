pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockWETH is MockERC20("WETH", "WETH", 18, 1000e18) {

}