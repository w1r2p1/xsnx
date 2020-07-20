pragma solidity 0.5.15;

import "./MockERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "synthetix/contracts/interfaces/IRewardEscrow.sol";

contract MockSynthetix is MockERC20 {
    using SafeMath for uint256;
    uint snxPrice = 1e18;
    uint DEC_18 = 1e18;

    address susdAddress;
    // address rewardEscrowAddress;
    IRewardEscrow rewardEscrow;
    bytes32 susd = "sUSD";

    mapping(address => uint) accountDebt;

    function setSusdAddress(address _susdAddress) public {
        susdAddress = _susdAddress;
    }

    function setRewardEscrowAddress(address _escrow) public {
        rewardEscrow = IRewardEscrow(_escrow);
    }

    constructor() MockERC20("SNX", "Synthetix", 18, 10000e18) public {

    }

    event Debts(uint currentDebt, uint futureDebt);
    function issueMaxSynths() external {
        uint escrowBal = rewardEscrow.balanceOf(msg.sender);
        uint snxVal = (balanceOf(msg.sender).add(escrowBal)).mul(snxPrice).div(DEC_18);
        uint currentDebt = accountDebt[msg.sender];
        uint futureDebt = snxVal.mul(targetRatio()).div(DEC_18);
        emit Debts(currentDebt, futureDebt);
        if(currentDebt >= futureDebt) return;
        uint susdToSend = futureDebt.sub(currentDebt);
        IERC20(susdAddress).transfer(msg.sender, susdToSend);
        accountDebt[msg.sender] = futureDebt;
    }

    function debtBalanceOf(address issuer, bytes32 currencyKey) external view returns (uint) {
        return accountDebt[issuer];
    }
    
    event DebtBurn(uint val);
    function burnSynths(uint amount) external {
        emit DebtBurn(amount);
        IERC20(susdAddress).transferFrom(msg.sender, address(this), amount);
        accountDebt[msg.sender] = accountDebt[msg.sender].sub(amount);
    }

    function addDebt(address issuer, uint amount) public {
        accountDebt[issuer] = accountDebt[issuer].add(amount);
    }

    function collateralisationRatio(address account) public view returns(uint) {
        uint snxVal = balanceOf(account).mul(snxPrice).div(DEC_18); // 10e18 * 1e18 / 1e18 = 10e18
        uint debtVal = accountDebt[account];
        return debtVal.mul(DEC_18).div(snxVal);
    }

    function targetRatio() public view returns(uint){
        return 125000000000000000; // 1.25e17
    }

    function getSusdAddress() public view returns(address){
        return susdAddress;
    }
}