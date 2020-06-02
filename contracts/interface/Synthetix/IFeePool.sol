pragma solidity 0.5.15;

interface IFeePool {
  function claimFees()
        external
        returns (bool);
  function feesAvailable(address account)
        external
        view
        returns (uint, uint);
  function isFeesClaimable(address account) external view returns (bool);      
}  