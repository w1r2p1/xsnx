pragma solidity 0.5.15;

import "./MockERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSynthetix is MockERC20 {
    using SafeMath for uint256;
    uint debtBalance;
    bool underCollat = false;
    uint snxPrice = 1e15;
    uint DEC_18 = 1e18;

    address susdAddress;

    mapping(address => uint) accountDebt;

    function setSusdAddress(address _susdAddress) public {
        susdAddress = _susdAddress;
    }

    constructor() MockERC20("SNX", "Synthetix", 18, 10000e18) public {

    }

    function issueMaxSynths() external {
        uint snxVal = balanceOf(msg.sender).mul(snxPrice).div(DEC_18); // how to include role of escrowed?
        uint currentDebt = accountDebt[msg.sender];
        uint futureDebt = snxVal.mul(targetRatio()).div(DEC_18); // 10e18 * 1e18 / 1.25e17
        if(currentDebt >= futureDebt) return;
        uint susdToSend = futureDebt.sub(currentDebt);
        IERC20(susdAddress).transfer(msg.sender, susdToSend);
        accountDebt[msg.sender] = futureDebt;
    }

    function debtBalanceOf(address issuer, bytes32 currencyKey) external view returns (uint) {
        return accountDebt[issuer];
    }
    
    function burnSynths(uint amount) external {
        accountDebt[msg.sender] = accountDebt[msg.sender].sub(amount);
    }

    function addDebt(address issuer, uint amount) public {
        accountDebt[issuer] = accountDebt[issuer].add(amount);
    }

    function collateralisationRatio(address account) external view returns(uint) {
        if(underCollat){
            return 142857142857142860; // 700%
        }
        return 125000000000000000; // 800%
    }

    function toggleCollat(bool _bool) public {
        underCollat = _bool;
    }

    function targetRatio() public view returns(uint){
        return 125000000000000000; // 1.25e17
    }

    function getSusdAddress() public view returns(address){
        return susdAddress;
    }
}