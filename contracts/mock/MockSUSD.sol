pragma solidity 0.5.15;

import "./MockERC20.sol";

contract MockSUSD is MockERC20("Synthetix USD", "sUSD", 18, 1000e18) {

}