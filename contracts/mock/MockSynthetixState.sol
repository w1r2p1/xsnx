pragma solidity 0.5.15;

contract MockSynthetixState {
    function issuanceRatio() public view returns(uint){
        return 125000000000000000; // 800%
    }
}