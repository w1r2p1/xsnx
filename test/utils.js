const { BN } = require('@openzeppelin/test-helpers')

const assertBNEqual = (a, b) => assert.equal(a.toString(), b.toString())
const BN_ZERO = new BN(0)
const ETH_USD = new BN(200)
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const collatDivisor = new BN(8)

module.exports = {
  assertBNEqual,
  BN_ZERO,
  ETH_USD,
  ETH_ADDRESS,
  collatDivisor,
}
