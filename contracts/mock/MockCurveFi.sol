pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockCurveFi {
    using SafeMath for uint256;

    address susdAddress; // 3
    address usdcAddress; // 1

    event CurveAmounts(uint srcAmt, uint destAmt);

    function exchange_underlying(int128 i, int128 j, uint amount, uint minReturn) public {
        // usdc 6 dec, susd 18 dec
        if (i == 1) {
            IERC20(usdcAddress).transferFrom(msg.sender, address(this), amount);
            IERC20(susdAddress).transfer(msg.sender, amount.mul(1e18).div(1e6)); 
            emit CurveAmounts(amount, amount.mul(1e18).div(1e6));
        }
        if (i == 3) {
            IERC20(susdAddress).transferFrom(msg.sender, address(this), amount);
            IERC20(usdcAddress).transfer(msg.sender, amount.mul(1e6).div(1e18));
        }
    }

    function setSusdAddress(address _susdAddress) public {
        susdAddress = _susdAddress;
    }

    function setUsdcAddress(address _usdcAddress) public {
        usdcAddress = _usdcAddress;
    }
}