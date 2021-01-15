pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRewardEscrowV2 {
    address snxAddress;
    uint balance = 0; 

    function balanceOf(address account) public view returns (uint) {
        return balance;
    }

    function setBalance(uint _balance) public {
        balance = _balance;
    }

    function setSnxAddress(address _snxAddress) public {
        snxAddress = _snxAddress;
    }

    function vest(uint256[] memory entryIds) public {
        IERC20(snxAddress).transfer(msg.sender, 1e18);
    }
}
 