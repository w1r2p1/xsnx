pragma solidity 0.5.15;

interface IRewardEscrow {
    function balanceOf(address account) external view returns (uint);
    function totalVestedAccountBalance(address account) external view returns(uint);
    function vest() external;
}