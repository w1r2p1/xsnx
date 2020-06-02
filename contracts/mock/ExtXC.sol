pragma solidity 0.5.15;

import "../xSNXCore.sol";

contract ExtXC is xSNXCore {
    constructor(address payable _tradeAccountingAddress, address _setAddress) public xSNXCore(_tradeAccountingAddress, _setAddress) {

    }

    function() external payable {
        
    }
}