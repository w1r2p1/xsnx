pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRewardEscrow {
    address snxAddress;
    uint vestedBal = 0;
    uint balance = 1e18; 
    function balanceOf(address account) public view returns (uint) {
        return balance;
    }

    function setBalance(uint _balance) public {
        balance = _balance;
    }

    function totalVestedAccountBalance(address _address) public view returns(uint){
        return vestedBal;
    }

    function setVestedBalance(uint amount) public {
        vestedBal = amount;
    }

    function setSnxAddress(address _snxAddress) public {
        snxAddress = _snxAddress;
    }

    function vest() public {
        IERC20(snxAddress).transfer(msg.sender, 1e18);
    }
}
 