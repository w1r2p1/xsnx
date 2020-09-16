//proxies
const xSNXCoreProxy = artifacts.require('xSNXCoreProxy');
const {
    increaseTime,
    ONE_DAY
} = require('./utils');

const truffleAssert = require('truffle-assertions');


contract("Proxy", accounts => {
    const admin = accounts[6];
    const cosigner1 = accounts[7];
    const cosigner2 = accounts[8];
    const nonPivilegedRole = accounts[9];
    const testImpl1 = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
    const testImpl2= "0xcEDA8318522D348f1d1aca48B24629b8FbF09020";


    beforeEach(async () => {
        testProxy = await xSNXCoreProxy.new(testImpl1, admin, cosigner1, cosigner2);
    })

    describe('Proxy Values', async () => {
        it("Should display correct co-signer 1, co-signer 2, admin, and implementation addresses", async () => {
            assert.equal(await testProxy.proxySigner(0), cosigner1)
            assert.equal(await testProxy.proxySigner(1), cosigner2)
            assert.equal(await testProxy.proxyAdmin(), admin)
            assert.equal(await testProxy.implementation(), testImpl1)
        })
    })

    describe('Changing the implementation contract', async () => {
        it("Should not let non-admins propose new implementations", async () => {            
            truffleAssert.reverts(testProxy.proposeNewImplementation(testImpl2, {from: cosigner1}))
            truffleAssert.reverts(testProxy.proposeNewImplementation(testImpl2, {from: nonPivilegedRole}))
            await testProxy.proposeNewImplementation(testImpl2,{ from: admin });
            assert.equal(await testProxy.proposedNewImplementation(), testImpl2)
        })

        it("Should be approved only by a co-signer", async () => {
            await testProxy.proposeNewImplementation(testImpl2,{ from: admin });
            truffleAssert.reverts(testProxy.confirmImplementation(testImpl2, {from: admin}))
            truffleAssert.reverts(testProxy.confirmImplementation(testImpl1, {from: cosigner1}))
            await testProxy.confirmImplementation(testImpl2, {from: cosigner1})
            assert.equal(await testProxy.implementation(), testImpl2)
        })
    })

    describe('Changing the Proxy Admin role', async () => {
        it("Should only let admin change the admin role", async () => {           
            truffleAssert.reverts(testProxy.proposeAdminTransfer(nonPivilegedRole, {from: cosigner1}))
            await testProxy.proposeAdminTransfer(nonPivilegedRole, {from: admin})

            assert.equal(await testProxy.proposedNewAdmin(), nonPivilegedRole)
        })

        it("Should only confirm admin change after 24 hours", async () => {
            await testProxy.proposeAdminTransfer(nonPivilegedRole, {from: admin})
            await truffleAssert.reverts(testProxy.confirmAdminTransfer({from : cosigner1})) 
            await truffleAssert.reverts(testProxy.confirmAdminTransfer({from : admin})) 

            await increaseTime(ONE_DAY)

            await testProxy.confirmAdminTransfer({ from: admin })

            assert.equal(await testProxy.proxyAdmin(), nonPivilegedRole)
        })
    })
})
