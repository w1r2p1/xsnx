const synthetix = require('synthetix')

const addressResolver = synthetix.getTarget({
  network: 'mainnet',
  contract: 'ReadProxyAddressResolver',
}).address

console.log('---------------')
console.log('addressResolver', addressResolver)
console.log('---------------')

const susd = synthetix.getTarget({
    network: 'mainnet',
    contract: 'ProxyERC20sUSD',
}).address
console.log('susd', susd)
console.log('---------------')

const snx = synthetix.getTarget({
    network: 'mainnet',
    contract: 'ProxyERC20',
}).address
console.log('snx', snx)