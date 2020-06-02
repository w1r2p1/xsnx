pragma solidity 0.5.15;

contract IxSNXCore {
	function withdrawableEthFees() external view returns (uint256);
	function withdrawableSusdFees() external view returns (uint256);
}