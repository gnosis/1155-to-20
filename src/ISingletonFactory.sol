// EIP 2470
interface ISingletonFactory {
    function deploy(
        bytes calldata initCode,
        bytes32 salt
    ) external returns (address payable deployedContract);
}
