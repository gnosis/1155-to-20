// SPDX-License-Identifier: LGPL-3.0-or-later

pragma solidity >=0.6.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ToyToken is ERC20 {
    constructor(string memory name, string memory symbol) public ERC20(name, symbol) {}
    
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
