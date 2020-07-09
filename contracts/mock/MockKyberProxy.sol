pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockKyberProxy {
    using SafeMath for uint256;

    address ethAddress;
    address snxAddress;
    address susdAddress;
    address wethAddress;
    address usdcAddress;

    constructor(address _ethAddress, address _snxAddress, address _susdAddress, address _wethAddress, address _usdcAddress) public {
        ethAddress = _ethAddress;
        snxAddress = _snxAddress;
        susdAddress = _susdAddress;
        wethAddress = _wethAddress;
        usdcAddress = _usdcAddress;
    }

    uint ethSnx = 200;
    uint ethUsd = 200;

    function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty) external view returns (uint expectedRate, uint slippageRate) {
        if(src == ERC20(ethAddress) && dest == ERC20(snxAddress)) return (200e18, 200e18);
        if(src == ERC20(ethAddress) && dest == ERC20(susdAddress)) return (200e18, 200e18);
        if(src == ERC20(ethAddress) && dest == ERC20(wethAddress)) return (1e18, 1e18);
        if(src == ERC20(ethAddress) && dest == ERC20(usdcAddress)) return (200e18, 200e18);

        if(src == ERC20(snxAddress) && dest == ERC20(ethAddress)) return (5e15, 5e15);
        if(src == ERC20(susdAddress) && dest == ERC20(ethAddress)) return (5e15, 5e15);
        if(src == ERC20(susdAddress) && dest == ERC20(wethAddress)) return (5e15, 5e15);
        if(src == ERC20(susdAddress) && dest == ERC20(usdcAddress)) return (1e18, 1e18);

        if(src == ERC20(wethAddress) && dest == ERC20(susdAddress)) return (200e18, 200e18);
    }
    function swapEtherToToken(ERC20 token, uint minConversionRate) external payable returns(uint) {
        if(token == ERC20(snxAddress)){
            IERC20(snxAddress).transfer(msg.sender, msg.value.mul(ethSnx));
        }
    }
    function swapTokenToEther(ERC20 token, uint tokenQty, uint minRate) external payable returns(uint) {
        if(token == ERC20(susdAddress)){
            msg.sender.transfer(tokenQty.div(ethUsd));
        }
    }
    function swapTokenToToken(ERC20 src, uint srcAmount, ERC20 dest, uint minConversionRate) public returns(uint){
        if(src == ERC20(wethAddress) && dest == ERC20(susdAddress)){
            IERC20(susdAddress).transfer(msg.sender, srcAmount.mul(ethUsd));
        }
        if(src == ERC20(susdAddress) && dest == ERC20(wethAddress)){
            IERC20(wethAddress).transfer(msg.sender, srcAmount.div(ethUsd));
        }

    }

    function() external payable {

    }
}