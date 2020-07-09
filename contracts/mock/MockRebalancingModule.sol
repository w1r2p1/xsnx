pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRebalancingModule {
    address setToken;
    address wethAddress;

    // uint valueOfOneSetInUsd = 250e18;
    event QtySent(uint amount);

    function setWethAddress(address _wethAddress) public {
        wethAddress = _wethAddress;
    }

    constructor(address _setToken) public {
        setToken = _setToken;
    }

    function redeemRebalancingSet(
        address _rebalancingSetAddress,
        uint256 _rebalancingSetQuantity,
        bool _keepChangeInVault
    ) public {
        uint wethToSend = 2e18; // underlying asset
        IERC20(wethAddress).transfer(msg.sender, wethToSend);
    }

    function issueRebalancingSet(
        address _rebalancingSetAddress,
        uint256 _rebalancingSetQuantity,
        bool _keepChangeInVault
    ) public {
        // IERC20 weth = IERC20(wethAddress);
        // weth.transferFrom(msg.sender, address(this), weth.balanceOf(msg.sender)); // job done by setTransferProxy on testnet/mainnet
        IERC20(setToken).transfer(msg.sender, _rebalancingSetQuantity);
        emit QtySent(_rebalancingSetQuantity);
    }
}