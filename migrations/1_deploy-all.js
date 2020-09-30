const toConfirmationPromise = promiEvent => new Promise((resolve, reject) => {
    promiEvent
        .on('confirmation', (_n, receipt) => resolve(receipt))
        .on('error', reject);
});

function buildCreate2Address(deployer, salt, bytecode) {
    return web3.utils.toChecksumAddress(`0x${web3.utils.soliditySha3(
        { t: 'bytes', v: '0xff' },
        { t: 'address', v: deployer },
        { t: 'bytes32', v: salt },
        { t: 'bytes32', v: web3.utils.keccak256(bytecode) }
    ).slice(-40)}`);
}

module.exports = (d, _network, [deployer]) => d.then(async () => {
    if (await web3.eth.getCode('0xce0042B868300000d44A59004Da54A005ffdcf9f') === '0x') {
        // greetz @3esmit and @forshtat
        await toConfirmationPromise(web3.eth.sendTransaction({
            from: deployer,
            to: '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D',
            value: 1e18
        }));
        await toConfirmationPromise(web3.eth.sendSignedTransaction('0xf9016c8085174876e8008303c4d88080b90154608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c634300060200331b83247000822470'));
        console.log('Deployed EIP 2470 SingletonFactory at 0xce0042B868300000d44A59004Da54A005ffdcf9f');
    } else {
        console.log('EIP 2470 SingletonFactory already deployed at 0xce0042B868300000d44A59004Da54A005ffdcf9f');
    }
    const singletonFactory = await artifacts.require('ISingletonFactory').at('0xce0042B868300000d44A59004Da54A005ffdcf9f')

    const Wrapped1155Factory = artifacts.require('Wrapped1155Factory');

    const wrapped1155FactoryAddress = buildCreate2Address(singletonFactory.address, '0x', Wrapped1155Factory.bytecode);

    if (await web3.eth.getCode(wrapped1155FactoryAddress) === '0x') {
        const { tx } = await singletonFactory.deploy(Wrapped1155Factory.bytecode, '0x');
        console.log(`Deployed Wrapped1155Factory at ${wrapped1155FactoryAddress}`);
    
        Wrapped1155Factory.address = wrapped1155FactoryAddress;
        Wrapped1155Factory.transactionHash = tx;

        const wrapped1155Factory = await Wrapped1155Factory.deployed();
        const wrapped1155ImplAddress = await wrapped1155Factory.erc20Implementation();

        const Wrapped1155 = artifacts.require('Wrapped1155');
        Wrapped1155.address = wrapped1155ImplAddress;
        Wrapped1155.transactionHash = tx;
    } else {
        try {
            const addressOnArtifact = Wrapped1155Factory.address;
            if (addressOnArtifact !== wrapped1155FactoryAddress) {
                console.warn(`Expected to find ${
                    wrapped1155FactoryAddress
                } set as Wrapped1155Factory address but instead found ${
                    Wrapped1155Factory.address
                } so the address is being updated, but the transaction hash should be manually corrected`);
            } else {
                console.log(`Found Wrapped1155Factory at ${wrapped1155FactoryAddress}`);
            }
        } catch(e) {
            if (e.message.startsWith('Wrapped1155Factory has no network configuration for its current network id')) {
                console.warn(`Expected to find ${
                    wrapped1155FactoryAddress
                } set as Wrapped1155Factory address but instead couldn't find an address, so the address is being updated, but the transaction hash should be manually added`);
            } else {
                throw e;
            }
        }
        Wrapped1155Factory.address = wrapped1155FactoryAddress;
    }
});
