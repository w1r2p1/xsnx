pragma solidity 0.5.15;

contract MockExchangeRates {
    bytes32 snx = "SNX";
    bytes32 susd = "sUSD";
    bytes32 seth = "sETH";

    uint snxPrice = 1e18;

    function rateAndUpdatedTime(bytes32 currency) public view returns(uint, uint){
        if (currency == snx) {
            return (snxPrice, block.timestamp - 10);
        }

        if (currency == susd) {
            return (1e18, block.timestamp - 10);
        }

        if (currency == seth) {
            return (200e18, block.timestamp - 10);
        }
    }
}