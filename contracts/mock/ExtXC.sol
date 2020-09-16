pragma solidity 0.5.15;

import "../xSNXCore.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

contract ExtXC is xSNXCore {
    uint256 private constant MAX_UINT = 2**256 - 1;
    
    function initialize(
        address payable _tradeAccountingAddress, 
        address _setAddress, 
        address _snxAddress, 
        address _susdAddress,
        address _setTransferProxy,
        address _addressResolver,
        address _rebalancingModule,
        address _ownerAddress
    ) public initializer {
        xSNXCore.initialize(
            _tradeAccountingAddress, 
            _setAddress,
            _snxAddress,
            _susdAddress,
            _setTransferProxy,
            _addressResolver,
            _rebalancingModule,
            _ownerAddress
        );
    }

    function() external payable {
        
    }

    function approveMock(address _toApprove, address _tokenAddress) public {
        IERC20(_tokenAddress).approve(_toApprove, MAX_UINT);
    }

}