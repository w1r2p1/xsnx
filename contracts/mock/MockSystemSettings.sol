pragma solidity 0.5.15;

contract MockSystemSettings {
    function issuanceRatio() public view returns(uint){
        return 125000000000000000; // 800%
    }
}