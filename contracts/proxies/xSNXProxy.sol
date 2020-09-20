pragma solidity 0.5.15;

import './Proxy.sol';

contract xSNXProxy is Proxy {
    constructor(
        address implementation,
        address proxyAdmin,
        address signer1,
        address signer2
    ) public Proxy(
        implementation,
        proxyAdmin,
        signer1,
        signer2
    ) {}
}
