require("dotenv").config();

var PrivateKeyProvider = require("truffle-privatekey-provider");

var privateKey = process.env.PRIVATE_KEY;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
      gas: 0x1fffffffffffff
    },
    kovan: {
      provider: new PrivateKeyProvider(
        privateKey,
        `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
      ),
      network_id: 42,
      gas: 6500000,
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      // skipDryRun: true // Skip dry run before migrations? (default: false for public nets )
    },
  },

  plugins: ["truffle-contract-size"],

  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.15", // Fetch exact version from solc-bin (default: truffle's version)
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
