pragma solidity 0.5.15;

import "./MockERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSynthetix is MockERC20 {
    using SafeMath for uint256;
    uint debtBalance;
    bool underCollat = false;

    address susdAddress;

    function setSusdAddress(address _susdAddress) public {
        susdAddress = _susdAddress;
    }

    constructor(uint _initialSupply) MockERC20("SNX", "Synthetix", 18, _initialSupply) public {

    }

    function issueMaxSynths() external {
        IERC20(susdAddress).transfer(msg.sender, 1e18);
    }

    function debtBalanceOf(address issuer, bytes32 currencyKey) external view returns (uint) {
        return 1000000000000000000;
    }
    
    function burnSynths(uint amount) external {
        underCollat = false;
    }

    function setDebtForRebalanceTowardsHedge() external {
        
    }

    function collateralisationRatio(address account) external view returns(uint) {
        if(underCollat){
            return 142857142857142860; // 700%
        }
        return 125000000000000000; // 800%
    }

    function stake(uint snxValueHeld) public {
        debtBalance = snxValueHeld.div(8);
    }

    function balanceOf(address _address) public view returns(uint){
        return 9e18; // owned
    }

    function toggleCollat(bool _bool) public {
        underCollat = _bool;
    }
}