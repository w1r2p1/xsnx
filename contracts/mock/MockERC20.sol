pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MockERC20 is ERC20Detailed, ERC20 {
  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint256 _initialSupply
  ) public ERC20Detailed(
    _name,
    _symbol,
    _decimals
  ) {
   _mint(msg.sender, _initialSupply);
  }

}