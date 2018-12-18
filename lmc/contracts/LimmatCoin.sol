pragma solidity ^0.4.18;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract LimmatCoin is StandardToken {
    string public name = 'LimmatCoin';
    string public symbol = 'LMC';
    uint8 public decimals = 2;
    uint public INITIAL_SUPPLY = 12000;

    constructor() {
      totalSupply_ = INITIAL_SUPPLY;
      balances[msg.sender] = INITIAL_SUPPLY;
    }

      /**
      * @dev Transfer token for a specified address with a message
      * @param to The address to transfer to.
      * @param value The amount to be transferred.
      * @param message The message sent along with the txn, encoded as uint256
      */
      function transferWithMessage(address to, uint256 value, string message) public returns (bool) {
        transfer(to, value);
      }
}