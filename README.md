# 1155-to-20
ERC 1155 to ERC 20 converter

## Deploying this to a network

1. Copy `.env.example` to `.env`.
2. Set SEED_PHRASE, GAS_PRICE, INFURA_PROJECT_ID, and ETHERSCAN_API accordingly in `.env`
3. `npx truffle migrate --network <network>`
4. Verify on Etherscan via `npx truffle run verify Wrapped1155Factory Wrapped1155 --license LGPL-3.0-or-later --network <network>`

Make sure the network you are referring to has been described in the `truffle-config.js`.

The migration will use a SingletonFactory described by EIP 2470 to deterministically deploy a Wrapped1155Factory at a specific location on chain. If the SingletonFactory already exists on the chain, that deployment will be skipped. Likewise, if the Wrapped1155Factory already exists on the chain, the deployment will be skipped.
