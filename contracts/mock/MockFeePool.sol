pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockFeePool {
    address susdAddress;
    function setSusdAddress(address _susdAddress) public {
        susdAddress = _susdAddress;
    }

    uint public feesAvailableToClaim = 2e18;

    function feesAvailable(address account, bytes32 currency) public view returns(uint, uint){
        return (feesAvailableToClaim, 10);
    }

    function makeFeesNotAvailable() public {
        feesAvailableToClaim = 0;
    }

    function makeFeesAvailable() public {
        feesAvailableToClaim = 2e18;
    }

    function claimFees() external returns(bool) {
        IERC20(susdAddress).transfer(msg.sender, 1e18);
        return true;
    }

}