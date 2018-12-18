import { contracts } from './contracts'
Meteor.methods({
  getBalance(contract) {
    return contracts[contract].getBalance(Meteor.user().address)
  },
  transferWithMessage(contract, to, amount, message) {
    const { address, privateKey } = Meteor.user()
    contracts[contract].transferWithMessage(
      { address, privateKey },
      to,
      Number.parseFloat(amount),
      message
    )
  },
  async getTransactionList(contract, range) {
    const transactionList = await contracts[
      contract
    ].listTransactionsWithMessage(Meteor.user().address, range)
    return transactionList.map(transaction => {
      const addressBookEntry = Meteor.user().addressBook.filter(
        addressBookItem => addressBookItem.address === transaction.peer
      )[0]
      if (addressBookEntry) {
        transaction.peerName = addressBookEntry.name
      }
      return transaction
    })
  },
  getAbi(contract) {
    return Assets.getText(`ethereum/contracts/${contract}/${contract}Abi.json`)
  }
})
