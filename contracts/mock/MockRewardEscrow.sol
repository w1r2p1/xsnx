pragma solidity 0.5.15;

contract MockRewardEscrow {
    uint balance = 1e18; 
    function balanceOf(address account) public view returns (uint) {
        return balance;
    }

    function setBalance(uint _balance) public {
        balance = _balance;
    }
}
 