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

    uint ethSnx = 100; // eth = $200, snx = $2
    uint ethUsd = 200;

    function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty) external view returns (uint expectedRate, uint slippageRate) {
        if(src == ERC20(ethAddress) && dest == ERC20(snxAddress)) return (100e18, 100e18);
        if(src == ERC20(ethAddress) && dest == ERC20(susdAddress)) return (200e18, 200e18);
        if(src == ERC20(ethAddress) && dest == ERC20(wethAddress)) return (1e18, 1e18);
        if(src == ERC20(ethAddress) && dest == ERC20(usdcAddress)) return (200e6, 200e6);

        if(src == ERC20(snxAddress) && dest == ERC20(ethAddress)) return (1e16, 1e16);
        if(src == ERC20(susdAddress) && dest == ERC20(ethAddress)) return (5e15, 5e15);
        if(src == ERC20(susdAddress) && dest == ERC20(wethAddress)) return (5e15, 5e15);
        if(src == ERC20(susdAddress) && dest == ERC20(usdcAddress)) return (1e6, 1e6);

        if(src == ERC20(wethAddress) && dest == ERC20(susdAddress)) return (200e18, 200e18);
    }
    event AmtToSend(uint amt);
    event InHere(address snx);
    event InHere2(address snx);
    function swapEtherToToken(ERC20 token, uint minConversionRate) external payable returns(uint amountToSend) {
        emit InHere(snxAddress);
        emit InHere2(address(token));
        if(token == ERC20(snxAddress)){
            amountToSend = msg.value.mul(ethSnx);
            emit AmtToSend(amountToSend);
            IERC20(snxAddress).transfer(msg.sender, amountToSend);
        }
    }
    function swapTokenToEther(ERC20 token, uint tokenQty, uint minRate) external payable returns(uint) {
        if(token == ERC20(susdAddress)){
            IERC20(susdAddress).transferFrom(msg.sender, address(this), tokenQty);
            msg.sender.transfer(tokenQty.div(ethUsd));
        }
        if(token == ERC20(usdcAddress)){
            IERC20(usdcAddress).transferFrom(msg.sender, address(this), tokenQty);
            msg.sender.transfer(tokenQty.div(ethUsd).mul(1e18).div(1e6)); // usdc = 6 dec, eth = 18 dec
        }
        if(token == ERC20(snxAddress)){
            IERC20(snxAddress).transferFrom(msg.sender, address(this), tokenQty);
            msg.sender.transfer(tokenQty.div(ethSnx));
        }
        if(token == ERC20(wethAddress)){
            IERC20(wethAddress).transferFrom(msg.sender, address(this), tokenQty);
            msg.sender.transfer(tokenQty);
        }
    }

    function swapTokenToToken(ERC20 src, uint srcAmount, ERC20 dest, uint minConversionRate) public returns(uint){
        if(src == ERC20(wethAddress) && dest == ERC20(susdAddress)){
            IERC20(wethAddress).transferFrom(msg.sender, address(this), srcAmount);
            IERC20(susdAddress).transfer(msg.sender, srcAmount.mul(ethUsd));
        }
        if(src == ERC20(wethAddress) && dest == ERC20(usdcAddress)){
            IERC20(wethAddress).transferFrom(msg.sender, address(this), srcAmount);
            IERC20(usdcAddress).transfer(msg.sender, srcAmount.mul(ethUsd).mul(1e6).div(1e18)); // usdc = 6 dec, eth = 18 dec
        }
        if(src == ERC20(susdAddress) && dest == ERC20(wethAddress)){
            IERC20(susdAddress).transferFrom(msg.sender, address(this), srcAmount);
            IERC20(wethAddress).transfer(msg.sender, srcAmount.div(ethUsd));
        }
        if(src == ERC20(usdcAddress) && dest == ERC20(wethAddress)){
            IERC20(usdcAddress).transferFrom(msg.sender, address(this), srcAmount);
            IERC20(wethAddress).transfer(msg.sender, srcAmount.div(ethUsd).mul(1e18).div(1e6)); // usdc = 6 dec, eth = 18 dec
        }

    }

    function() external payable {

    }
}