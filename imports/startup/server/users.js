import Web3Accounts from 'web3-eth-accounts'
import { filterValuesByKey } from '../../utils'
import { host, port } from '../../ethereum'

Accounts.onCreateUser(function(options, user) {
  const accounts = new Web3Accounts(`http://${host}:${port}`)
  const { address, privateKey } = accounts.create()
  user.privateKey = privateKey
  user.address = address
  user.addressBook = []
  return user
})

Meteor.publish(null, function() {
  return Meteor.users.find(this.userId, {
    fields: { address: 1, addressBook: 1 }
  })
})

Meteor.methods({
  insertAddressBookEntry(name, address) {
    const addressBook = Meteor.user().addressBook
    const names = filterValuesByKey(addressBook, 'name')
    const addresses = filterValuesByKey(addressBook, 'address')
    if (names.includes(name)) {
      throw new Meteor.Error(400, 'Name already exists in addressbook.')
    }
    if (addresses.includes(address)) {
      addressBook.map(entry => {
        if (entry.address === address) {
          entry.name = name
        }
        return entry
      })
    } else {
      addressBook.push({ name, address })
    }
    Meteor.users.update({ _id: Meteor.userId() }, { $set: { addressBook } })
  }
})
