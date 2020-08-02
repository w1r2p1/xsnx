pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockUSDC is MockERC20("USDC", "USDC", 6, 1000000000000000e6) {

}