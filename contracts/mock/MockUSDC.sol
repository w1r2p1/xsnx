pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockUSDC is MockERC20("USDC", "USDC", 8, 1000e18) {

}