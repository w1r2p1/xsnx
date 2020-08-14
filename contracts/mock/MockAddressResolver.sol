pragma solidity 0.5.15;

contract MockAddressResolver {
    address public exchangeRatesAddress;
    address public feePoolAddress;
    address public rewardEscrowAddress;
    address public synthetixStateAddress;
    address public synthetixAddress;
    address public systemSettingsAddress;

    bytes32 constant exchangeRatesName = "ExchangeRates";
    bytes32 constant feePoolName = "FeePool";
    bytes32 constant rewardEscrowName = "RewardEscrow";
    bytes32 constant synthetixStateName = "SynthetixState";
    bytes32 constant synthetixName = "Synthetix";
    bytes32 constant systemSettingsName = "SystemSettings";

    constructor(address _exchangeRatesAddress, address _feePoolAddress, address _rewardEscrowAddress, address _synthetixStateAddress, address _synthetixAddress, address _systemSettingsAddress) public {
        exchangeRatesAddress = _exchangeRatesAddress;
        feePoolAddress = _feePoolAddress;
        rewardEscrowAddress = _rewardEscrowAddress;
        synthetixStateAddress = _synthetixStateAddress;
        synthetixAddress = _synthetixAddress;
        systemSettingsAddress = _systemSettingsAddress;
    }

    function getAddress(bytes32 name) public view returns (address) {
        if(exchangeRatesName == name) return exchangeRatesAddress;
        if(feePoolName == name) return feePoolAddress;
        if(rewardEscrowName == name) return rewardEscrowAddress;
        if(synthetixStateName == name) return synthetixStateAddress;
        if(synthetixName == name) return synthetixAddress;
        if(systemSettingsName == name) return systemSettingsAddress;
    }
}