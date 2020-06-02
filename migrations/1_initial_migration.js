const Migrations = artifacts.require("Migrations");

// mainnet addresses
// const setAddress = "0xeF0fDA1d4bd73DDC2f93A4e46E2E5aDBC2D668f4"; //ethmacoapy
// const oneSplitAddress = "0x3F3e18aef051dC2b489CEf138BB9e224F78f7117";
// const snxAddress = "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F"; // proxy address that works for oneSplit


module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
