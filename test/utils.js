const { BN } = require('@openzeppelin/test-helpers')

const assertBNEqual = (a, b) => assert.equal(a.toString(), b.toString())
const BN_ZERO = new BN(0)
const ETH_USD = new BN(200)
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const collatDivisor = new BN(8)
const DEC_18 = new BN(web3.utils.toWei('1'))
const toNumber = (val) => Number(val.toString())
const bn = val => new BN(val)
const FIVE_HOURS = 60 * 60 * 5
const FOUR_DAYS = 60 * 60 * 24 * 4

const increaseTime = async seconds => {
  const id = Date.now();
   return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id,
    }, (err1) => {
      if (err1) return reject(err1);

      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
    });
  });
}

module.exports = {
  assertBNEqual,
  BN_ZERO,
  ETH_USD,
  ETH_ADDRESS,
  collatDivisor,
  DEC_18,
  toNumber,
  bn,
  increaseTime,
  FIVE_HOURS,
  FOUR_DAYS
}
