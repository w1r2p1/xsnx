pragma solidity 0.5.15;

contract MockExchangeRates {
    bytes32 snx = "SNX";
    bytes32 susd = "sUSD";
    bytes32 seth = "sETH";

    bool underCollat = false;

    function toggleCollat() public {
        underCollat = !underCollat;
    }

    function rateForCurrency(bytes32 currency) public view returns(uint){
        if (currency == snx) {
            if (underCollat) {
                return 7e17; // $0.70
            } else {
                return 8e17; // $0.80
            }
        }

        if (currency == susd) {
            return 1e18;
        }

        if (currency == seth) {
            return 200e18;
        }
    }
}