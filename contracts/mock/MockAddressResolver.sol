pragma solidity 0.5.15;

contract MockAddressResolver {
    address public exchangeRatesAddress;
    address public feePoolAddress;
    address public rewardEscrowV2Address;
    address public synthetixStateAddress;
    address public synthetixAddress;
    address public systemSettingsAddress;

    bytes32 constant exchangeRatesName = "ExchangeRates";
    bytes32 constant feePoolName = "FeePool";
    bytes32 constant rewardEscrowV2Name = "RewardEscrowV2";
    bytes32 constant synthetixStateName = "SynthetixState";
    bytes32 constant synthetixName = "Synthetix";
    bytes32 constant systemSettingsName = "SystemSettings";

    constructor(address _exchangeRatesAddress, address _feePoolAddress, address _rewardEscrowV2Address, address _synthetixStateAddress, address _synthetixAddress, address _systemSettingsAddress) public {
        exchangeRatesAddress = _exchangeRatesAddress;
        feePoolAddress = _feePoolAddress;
        rewardEscrowV2Address = _rewardEscrowV2Address;
        synthetixStateAddress = _synthetixStateAddress;
        synthetixAddress = _synthetixAddress;
        systemSettingsAddress = _systemSettingsAddress;
    }

    function getAddress(bytes32 name) public view returns (address) {
        if(exchangeRatesName == name) return exchangeRatesAddress;
        if(feePoolName == name) return feePoolAddress;
        if(rewardEscrowV2Name == name) return rewardEscrowV2Address;
        if(synthetixStateName == name) return synthetixStateAddress;
        if(synthetixName == name) return synthetixAddress;
        if(systemSettingsName == name) return systemSettingsAddress;
    }
}