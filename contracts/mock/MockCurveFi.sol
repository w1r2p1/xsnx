pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCurveFi {
    address susdAddress; // 3
    address usdcAddress; // 1

    function exchange_underlying(int128 i, int128 j, uint amount, uint minReturn) public {
        if (i == 1) {
            IERC20(usdcAddress).transferFrom(msg.sender, address(this), amount);
            IERC20(susdAddress).transfer(msg.sender, amount);
        }
        if (i == 3) {
            IERC20(susdAddress).transferFrom(msg.sender, address(this), amount);
            IERC20(usdcAddress).transfer(msg.sender, amount);
        }
    }

    function setSusdAddress(address _susdAddress) public {
        susdAddress = _susdAddress;
    }

    function setUsdcAddress(address _usdcAddress) public {
        usdcAddress = _usdcAddress;
    }
}