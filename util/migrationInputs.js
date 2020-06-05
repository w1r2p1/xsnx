const synthetix = require('synthetix')

const deployment = 'ETH20SMACO'
// const deployment = "LINKETHRSI"

const isEth20Smaco = deployment === 'ETH20SMACO'

const migrationInputs = {
  SET_ADDRESS: {
    kovan: '0x76f579bb28a470913AbE98fc9d76145c26839af7', // LINKETHRSI
    mainnet: isEth20Smaco ? '' : '',
  },
  SET_ASSET_1: {
    kovan: '0x8a18c7034acefd1748199a58683ee5f22e2d4e45', // WETH
    mainnet: isEth20Smaco ? '' : '',
  },
  SET_ASSET_2: {
    kovan: '0x61eB5a373c4Ec78523602583c049d8563d2C7BCD', // LINK
    mainnet: isEth20Smaco ? '' : '',
  },
  KYBER_PROXY: {
    kovan: '0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D',
    mainnet: '',
  },
  ADDRESS_RESOLVER: {
    kovan: synthetix.getTarget({
      network: 'kovan',
      contract: 'AddressResolver',
    }).address,
    mainnet: '',
  },
  REBALANCING_MODULE: {
    kovan: '0x91E1489D04054Ae552a369504F94E0236909c53c',
    mainnet: '',
  },
  SUSD_ADDRESS: {
    kovan: synthetix.getTarget({ network: 'kovan', contract: 'ProxyERC20sUSD' })
      .address,
    mainnet: '',
  },
  SNX_ADDRESS: {
    kovan: synthetix.getTarget({ network: 'kovan', contract: 'ProxyERC20' })
      .address,
    mainnet: '',
  },
  SET_TRANSFER_PROXY: {
    kovan: '0x61d264865756751392C0f00357Cc26ea70D98E3B',
    mainnet: '',
  },
  SYNTH_SYMBOLS: {
    kovan: ['sETH', 'sLINK'],
    mainnet: isEth20Smaco ? [] : [],
  },
}

module.exports = migrationInputs
