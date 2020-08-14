const synthetix = require('synthetix')

const deployment = 'ETHRSI6040'
// const deployment = "LINKETHRSI"

const isEthRsi6040 = deployment === 'ETHRSI6040'

const migrationInputs = {
  SET_ADDRESS: {
    kovan: '0x90577B0489e76a1D7bb207AaF33EcebFa1ED0944', // in USDC
    // kovan: '0xF8e8111720e86ce1D6d3710a1e34B57e1D54aef3', // in WETH
    mainnet: '0x93E01899c10532d76C0E864537a1D26433dBbDdB', // ETHRSI6040
  },
  SET_ASSET_1: {
    kovan: '0x8a18c7034acefd1748199a58683ee5f22e2d4e45', // WETH
    mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  },
  SET_ASSET_2: {
    kovan: '0x15758350DECEA0E5A96cFe9024e3f352d039905a', // USDC
    mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  },
  KYBER_PROXY: {
    kovan: '0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D',
    mainnet: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',
  },
  ADDRESS_RESOLVER: {
    kovan: synthetix.getTarget({
      network: 'kovan',
      contract: 'ReadProxyAddressResolver',
    }).address,
    mainnet: '',
  },
  REBALANCING_MODULE: {
    kovan: '0x91E1489D04054Ae552a369504F94E0236909c53c',
    mainnet: '0xcEDA8318522D348f1d1aca48B24629b8FbF09020',
  },
  CURVE_POOL: {
    kovan: '0xcd8F4131730900720B1362d7f1a88213BB42Da3c',
    mainnet: '0xA5407eAE9Ba41422680e2e00537571bcC53efBfD',
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
  USDC_ADDRESS: {
    kovan: '0x15758350DECEA0E5A96cFe9024e3f352d039905a',
    mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  },
  SET_TRANSFER_PROXY: {
    kovan: '0x61d264865756751392C0f00357Cc26ea70D98E3B',
    mainnet: '0x882d80D3a191859d64477eb78Cca46599307ec1C',
  },
  SYNTH_SYMBOLS: {
    kovan: ['sETH', 'sUSD'],
    mainnet: ['sETH', 'sUSD'],
  },
}

module.exports = migrationInputs
