# 1155-to-20
ERC 1155 to ERC 20 converter

This smart contract it will allow to wrap and unwrap an ERC-1155 into an ERC-20 token. To make this possible the contract will create a relationship between the contract and an ERC-20 bytecode generated on `getWrapped1155DeployBytecode` using the `Wrapped1155Factory`.

## Deploying this to a network

1. Copy `.env.example` to `.env`.
2. Set SEED_PHRASE, GAS_PRICE, INFURA_PROJECT_ID, and ETHERSCAN_API accordingly in `.env`
3. `npx truffle migrate --network <network>`
4. Verify on Etherscan via `npx truffle run verify Wrapped1155Factory Wrapped1155 --license LGPL-3.0-or-later --network <network>`

Make sure the network you are referring to has been described in the `truffle-config.js`.

The migration will use a SingletonFactory described by EIP 2470 to deterministically deploy a Wrapped1155Factory at a specific location on chain. If the SingletonFactory already exists on the chain, that deployment will be skipped. Likewise, if the Wrapped1155Factory already exists on the chain, the deployment will be skipped.

## Verify

For etherscan verification

- Add your API key id on `.env` file.

- Run the following code. 
```
truffle run verify Wrapped1155Factory@{factory address} --network {network name} --license LGPL-3.0-or-later
```

## ERC-20 `getWrapped1155DeployBytecode` bytecode

For a token name `WrappedERC-1155` (hex"557f577261707065644552432d31313535"), symbol `WMT` (hex"574d54"), and 18 decimals (hex"12") this is the returned bytecode:
```
0x73d7acd2a9fd159e69bb102a1ca21c9a3e3a5f771b3d55737ef2e0048f5baede046f6bf797943daf4ed8cb476020557f00000000000000000000000000000000000000000000000000000000000000006040557f577261707065644552432d313135350000000000000000000000000000001e60c0557f574d54000000000000000000000000000000000000000000000000000000000660e055601261010055602c6040518160a08237f33d3d3d3d363d3d37363d73d840735f4b6a0d1af8fa48ece560f4778c0073975af43d3d93803e602a57fd5bf3
```

### Opcodes

Here are the following opcodes used for that method:

- 0x73: Pushes 20 bytes to memory, in this case the address of the factory.

- 0x3d55:
3d -> return datasize allows us to push a 0 onto stack with minimal gas costs.
55-> stores the data in stack storage 1 (factory address) at slot specified in stack storage 0 (0).

- 0x600255:
0x6002 -> push the next 1 byte of the instruction data onto stack (02)
0x55-> Stores the data in stack storage 1 (tokenId) at slot specified in stack storage 0 (02).

### More-Minimal Proxy runtime bytecode

To deploy cheap contract there is a [EIP-1167 Minimal Proxy contract](https://eips.ethereum.org/EIPS/eip-1167) that will especify a minimal bytecode implementation that delegates all calls to a known, fixed address. The fixed address used for this will be `erc20Implementation` as a new `Wrapped1155` which will be allowed to `mint` and `burn` ERC-20 by the `Wrapped1155Factory` contract to generate the tokens when Conditional Token contract transfer the conditional token (`safeTransferFrom`) using the `onERC1155Received`. 

The 1155-to-20 use the [More-Minimal Proxy bytecode by Oage](https://medium.com/coinmonks/the-more-minimal-proxy-5756ae08ee48). Here is the table of the bytecode instructions:

```
0x3d3d3d3d363d3d37363d73{adress(erc20Implementation)}5af43d3d93803e602a57fd5bf3pc    op / pushdata  opcode              stack (top on the left)
----  -------------  ------------------  ------------------------
0x00  3d             returndatasize      0
0x01  3d             returndatasize      0 0 
0x02  3d             returndatasize      0 0 0
0x03  3d             returndatasize      0 0 0 0
0x04  36             calldatasize        cds 0 0 0 0
0x05  3d             returndatasize      0 cds 0 0 0 0
0x06  3d             returndatasize      0 0 cds 0 0 0 0
0x07  37             calldatacopy        0 0 0 0
0x08  36             calldatasize        cds 0 0 0 0
0x09  3d             returndatasize      0 cds 0 0 0 0
0x0a  73{adress(erc20Implementation)}  push20 {adress(erc20Implementation)} 0 cds 0 0 0 0
0x1f  5a             gas                 gas 0xbebe 0 cds 0 0 0 0
0x20  f4             delegatecall        suc 0 0
0x21  3d             returndatasize      rds suc 0 0
0x22  3d             returndatasize      rds rds suc 0 0
0x23  93             swap4               0 rds suc 0 rds
0x24  80             dup1                0 0 rds suc 0 rds
0x25  3e             returndatacopy      suc 0 rds
0x26  602a           push1 0x2a          0x2a suc 0 rds
0x28  57             jumpi               0 rds
0x29  fd             revert
0x2a  5b             jumpdest            0 rds
0x2b  f3             return
```

## References

- https://eips.ethereum.org/EIPS/eip-1167
- https://blog.openzeppelin.com/deep-dive-into-the-minimal-proxy-contract/
- https://medium.com/coinmonks/the-more-minimal-proxy-5756ae08ee48