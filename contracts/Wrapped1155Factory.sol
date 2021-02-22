    // SPDX-License-Identifier: LGPL-3.0-or-later

pragma solidity >=0.6.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { ERC1155Receiver } from "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";

contract Wrapped1155Metadata {
    // workaround which also arranges first storage slots of Wrapped1155
    Wrapped1155Factory public factory;
    IERC1155 public multiToken;
    uint256 public tokenId;
    
    modifier onlyFactory() {
        require(msg.sender == address(factory), "Wrapped1155: only factory allowed to perform operation");
        _;
    }
}

contract Wrapped1155 is Wrapped1155Metadata, ERC20 {

    constructor() public ERC20("Wrapped ERC-1155 Implementation", "WMT*") {}

    function mint(address account, uint256 amount) external onlyFactory {
        _mint(account, amount);
    }
    
    function burn(address account, uint256 amount) external onlyFactory {
        _burn(account, amount);
    }
}

contract Wrapped1155Factory is ERC1155Receiver {
    using Address for address;

    Wrapped1155 public erc20Implementation;

    event Deposit(address recipient, bytes data);

    constructor() public {
        erc20Implementation = new Wrapped1155();
    }

    function onERC1155Received(
        address operator,
        address /* from */,
        uint256 id,
        uint256 value,
        bytes calldata data
    )
        external
        override
        returns (bytes4)
    {
        address recipient = operator;
        // 0x577261707065644552432d31313535000000000000000000000000000000001E574d54000000000000000000000000000000000000000000000000000000000612
        // 7a250d5630B4cF539739dF2C5dAcb4c659F2488D
        // address recipient = data.length > 65 ?
        //     abi.decode(bytes(data[65:85]), (address)) :
        //     operator;
        emit Deposit(recipient, data);

        Wrapped1155 wrapped1155 = requireWrapped1155(IERC1155(msg.sender), id, data);
        wrapped1155.mint(recipient, value);

        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address /* from */,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    )
        external
        override
        returns (bytes4)
    {
        address recipient = operator;
        // if (data.length > 0) {
        //     (
        //         recipient,
        //         tokenName,
        //         tokenNameLength
        //     ) = abi.decode(data, (address, bytes, bytes));
        // }

        for (uint i = 0; i < ids.length; i++) {
            requireWrapped1155(IERC1155(msg.sender), ids[i], data).mint(recipient, values[i]);
        }

        return this.onERC1155BatchReceived.selector;
    }

    function unwrap(
        IERC1155 multiToken,
        uint256 tokenId,
        uint256 amount,
        address recipient,
        bytes calldata data
    )
        external
    {
        getWrapped1155(multiToken, tokenId, data).burn(msg.sender, amount);
        multiToken.safeTransferFrom(address(this), recipient, tokenId, amount, data);
    }

    function batchUnwrap(
        IERC1155 multiToken,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        address recipient,
        bytes calldata data
    )
        external
    {
        require(tokenIds.length == amounts.length, "Wrapped1155Factory: mismatched input arrays");
        for (uint i = 0; i < tokenIds.length; i++) {
            getWrapped1155(multiToken, tokenIds[i], data).burn(msg.sender, amounts[i]);
        }
        multiToken.safeBatchTransferFrom(address(this), recipient, tokenIds, amounts, data);
    }

    function getWrapped1155DeployBytecode(
        IERC1155 multiToken, 
        uint256 tokenId, 
        bytes calldata data
    )
        public
        view
        returns (bytes memory)
    {
        // calldata tiene que ser múltiplo de 32 bytes
        // hay que llenar todo de zeros al final de la cadena
        bytes memory tokenName = bytes(data[:32]);
        bytes memory tokenSymbol = bytes(data[32:64]); // uint232(6)
        bytes memory tokenDecimal = bytes(data[64:65]); // uint8(18) = 0x12
        return abi.encodePacked(
            // assign factory
            hex"73",
            this,
            hex"3d55",
            
            // assign multiToken
            hex"73",
            multiToken,
            hex"600155",
            
            // assign tokenId
            hex"7f",
            tokenId,
            hex"600255",
            
            // assign name
            hex"7f",
            // Chars in hex or UTF-8 = 8 bits => 2 hex numbers => 
            // string + uint128(30) for 16 chars needs to padding zeros 
            // and the length of the string
            // leading zeros = (62 - (tokenName.length * 2))
            // Wrapped ERC-1155GnosisProtocol = 31 * 2 zeros + length * 2 in hex
            // (62 - (31 * 2)) = 0 zeros + length * 2 in hex
            // "Wrapped ERC-1155", uint128(32), 
            // Wrapped ERC-1155 = 16 zeros + length * 2 in hex
            // WrappedERC-1155 = 15 * 2 zeros + length * 2 in hex
            // (62 - (15 * 2)) = 16
            //"WrappedERC-1155", hex"000000000000000000000000000000001E", 
            //tokenName, 
            //"Wrapped ERC-1155", uint128(32), // hex"0000000000000000000000000000000020",
            //"Wrapped ERC-1155", hex"0000000000000000000000000000000020",
            //tokenName,
            //bytes(tokenName), hex"000000000000000000000000000000001E"
            tokenName,
            hex"600655",
            
            // assign symbol
            hex"7f",
            // Chars in hex or UTF-8 = 8 bits => 2 hex numbers => 
            // string + uint128(30) for 16 chars needs to padding zeros 
            // and the length of the string
            //"WMT", uint232(6),
            //hex"574d54", hex"0000000000000000000000000000000000000000000000000000000006"            
            tokenSymbol,
            hex"600755",
            
            // assign decimals
            hex"60",
            // push one byte
            // min 1, max 2^8
            // uint8(18), 
            //hex"12",
            tokenDecimal, 
            hex"600855",

            // push 44 (length of runtime)
            hex"60", uint8(44),
            // load free memory pointer
            hex"604051",

            // dup runtime length
            hex"81",
            // push offset in this calldata to runtime object,
            hex"60", uint8(171),
            // dup free memory pointer
            hex"82"
            
            // codecopy runtime to memory and return
            hex"39f3",

            // greetz 0age for More-Minimal Proxy runtime bytecode:
            hex"3d3d3d3d363d3d37363d73",
            address(erc20Implementation),
            hex"5af43d3d93803e602a57fd5bf3"
        );
    }
    
    function getWrapped1155(
        IERC1155 multiToken,
        uint256 tokenId,
        bytes calldata data
    )
        public
        view
        returns (Wrapped1155)
    {
        // bytes memory tokenName = hex"577261707065644552432d31313535"; // "WrappedERC-1155";
        return Wrapped1155(address(uint256(keccak256(abi.encodePacked(
            uint8(0xff),
            this,
            uint256(1155),
            keccak256(getWrapped1155DeployBytecode(multiToken, tokenId, data))
        )))));
    }

    event Wrapped1155Creation(
        IERC1155 indexed multiToken,
        uint256 indexed tokenId,
        Wrapped1155 indexed wrappedToken
    );

    function requireWrapped1155(
        IERC1155 multiToken,
        uint256 tokenId,
        bytes calldata data
    )
        public
        returns (Wrapped1155)
    {
        bytes memory deployBytecode = getWrapped1155DeployBytecode(multiToken, tokenId, data);

        address wrapped1155Address = address(uint256(keccak256(abi.encodePacked(
            uint8(0xff),
            this,
            uint256(1155),
            keccak256(deployBytecode)
        ))));

        if (!wrapped1155Address.isContract()) {
            address addr;
            assembly {
              addr := create2(0, add(deployBytecode, 0x20), mload(deployBytecode), 1155)
            }
            require(wrapped1155Address == addr, "Wrapped1155Factory: failed to deploy");

            emit Wrapped1155Creation(
                multiToken,
                tokenId,
                Wrapped1155(wrapped1155Address)
            );
        }

        return Wrapped1155(wrapped1155Address);
    }
}
