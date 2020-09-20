//proxies
const xSNXAdminProxy = artifacts.require('xSNXAdminProxy');
const xSNXAdmin = artifacts.require('xSNXAdmin');
const ERC20 = artifacts.require('ERC20');
const { increaseTime, ONE_DAY } = require('./utils');

const truffleAssert = require('truffle-assertions');

contract('Proxy', (accounts) => {
	const admin = accounts[6];
	const cosigner1 = accounts[7];
	const cosigner2 = accounts[8];
	const nonPrivilegedRole = accounts[9];

	beforeEach(async () => {
        testImplContract = await xSNXAdmin.new()
        testImplAddress = testImplContract.address
        incorrectImpl = await ERC20.new() 
        incorrectImplAddress = incorrectImpl.address
        futureImpl = await ERC20.new()
        futureImplAddress = futureImpl.address
        testProxy = await xSNXAdminProxy.new(testImplAddress, admin, cosigner1, cosigner2);
	});

	describe('Proxy Values', async () => {
		it('Should display correct co-signer 1, co-signer 2, admin, and implementation addresses', async () => {
			assert.equal(await testProxy.proxySigner(0), cosigner1);
			assert.equal(await testProxy.proxySigner(1), cosigner2);
			assert.equal(await testProxy.proxyAdmin(), admin);
			assert.equal(await testProxy.implementation(), testImplAddress);
		});
	});

	describe('Changing the implementation contract', async () => {
        it('should not let admin propose a non-contract address as new implementation', async() => {
            truffleAssert.reverts(testProxy.proposeNewImplementation(nonPrivilegedRole, { from: admin }));
        })

		it('Should not let non-admins propose new implementations', async () => {
			truffleAssert.reverts(testProxy.proposeNewImplementation(futureImplAddress, { from: cosigner1 }));
			truffleAssert.reverts(testProxy.proposeNewImplementation(futureImplAddress, { from: nonPrivilegedRole }));
			await testProxy.proposeNewImplementation(futureImplAddress, { from: admin });
			assert.equal(await testProxy.proposedNewImplementation(), futureImplAddress);
		});

		it('Should be approved only by a co-signer', async () => {
			await testProxy.proposeNewImplementation(futureImplAddress, { from: admin });
			truffleAssert.reverts(testProxy.confirmImplementation(futureImplAddress, { from: admin }));
			truffleAssert.reverts(testProxy.confirmImplementation(incorrectImplAddress, { from: cosigner1 }));
			await testProxy.confirmImplementation(futureImplAddress, { from: cosigner1 });
			assert.equal(await testProxy.implementation(), futureImplAddress);
		});
	});

	describe('Changing the Proxy Admin role', async () => {
		it('Should only let admin change the admin role', async () => {
			truffleAssert.reverts(testProxy.proposeAdminTransfer(testImplAddress, { from: cosigner1 }));
			await testProxy.proposeAdminTransfer(nonPrivilegedRole, { from: admin });

			assert.equal(await testProxy.proposedNewAdmin(), nonPrivilegedRole);
		});

		it('Should only confirm admin change after 24 hours', async () => {
			await testProxy.proposeAdminTransfer(nonPrivilegedRole, { from: admin });
			await truffleAssert.reverts(testProxy.confirmAdminTransfer({ from: cosigner1 }));
			await truffleAssert.reverts(testProxy.confirmAdminTransfer({ from: admin }));

			await increaseTime(ONE_DAY);

			await testProxy.confirmAdminTransfer({ from: admin });

			assert.equal(await testProxy.proxyAdmin(), nonPrivilegedRole);
		});
	});
});
