pragma solidity 0.5.15;

contract MockExchangeRates {
    bytes32 snx = "SNX";
    bytes32 susd = "sUSD";
    bytes32 seth = "sETH";

    uint snxPrice = 1e18;

    function rateForCurrency(bytes32 currency) public view returns(uint){
        if (currency == snx) {
            return snxPrice;
        }

        if (currency == susd) {
            return 1e18;
        }

        if (currency == seth) {
            return 200e18;
        }
    }
}