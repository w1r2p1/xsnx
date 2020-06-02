pragma solidity 0.5.15;

contract IExchangeRates {
     function rateForCurrency(bytes32 currencyKey) public view returns (uint);
}