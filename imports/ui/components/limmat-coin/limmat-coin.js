import './limmat-coin.html'
import { Promise } from 'meteor/promise'
import { Template } from 'meteor/templating'
import { ReactiveVar } from 'meteor/reactive-var'
import { guid } from '../../../utils'
import { ERC20Contract } from '../../../ethereum/erc20-contract'

Template.limmatCoin.onCreated(function limmatCoinOnCreated() {
  this.balance = new ReactiveVar(0)
  this.address = new ReactiveVar(null)
  this.transactionList = new ReactiveVar([])
  this.addressIsValid = new ReactiveVar(false)
  this.showValidationError = new ReactiveVar(false)
  this.showAddressBook = new ReactiveVar(false)

  if (typeof web3 !== 'undefined') {
    this.web3 = web3
    const self = this
    Meteor.call('getAbi', 'lmc', async (error, limmatCoinAbiRaw) => {
      self.contract = new ERC20Contract(
        web3,
        limmatCoinAbiRaw,
        Meteor.settings.public.contracts.lmc
      )
      const account = web3.eth.accounts[0]
      self.balance.set(await self.contract.getBalance(account))
      self.address.set(account)
      self.transactionList.set(
        await self.contract.listTransactionsWithMessage(account, 20)
      )
    })
  } else {
    Meteor.call('getBalance', 'lmc', (error, result) => {
      this.balance.set(result)
    })
    Meteor.call('getTransactionList', 'lmc', 20, (error, result) => {
      this.transactionList.set(result)
    })
  }
})
Template.limmatCoin.helpers({
  address() {
    return (
      Template.instance().address.get() ||
      (Meteor.user() ? Meteor.user().address : null)
    )
  },
  balance() {
    return Template.instance().balance.get()
  },
  addressBook() {
    return Meteor.user().addressBook
  },
  transactionList() {
    return Template.instance().transactionList.get()
  },
  addressIsValid() {
    return Template.instance().addressIsValid.get()
  },
  showValidationError() {
    return Template.instance().showValidationError.get()
  },
  showAddressBook() {
    return Template.instance().showAddressBook.get()
  }
})
Template.limmatCoin.events({
  async 'submit .send-asset'(event, templateInstance) {
    // Prevent default browser form submit
    event.preventDefault()
    if (!templateInstance.addressIsValid.get()) {
      templateInstance.showValidationError.set(true)
      return
    }
    // Get value from form element
    const target = event.target
    let { to_address, amt, msg } = target
    if (templateInstance.web3) {
      await templateInstance.contract.transferWithMessage(
        { address: templateInstance.address.get() },
        to_address.value,
        amt.value,
        msg.value
      )
    } else {
      Meteor.call(
        'transferWithMessage',
        'lmc',
        to_address.value,
        amt.value,
        msg.value
      )
    }
    to_address.value = amt.value = msg.value = ''
    templateInstance.showValidationError.set(false)
    // TODO update balance and transaction list
  },
  'keyup #toAddress'(event, templateInstance) {
    const input = event.currentTarget.value
    validateAddressInput(templateInstance, input)
  },
  'focus #toAddress'(event, templateInstance) {
    if (Meteor.user() === null || Meteor.user().addressBook.length < 1) return
    templateInstance.showAddressBook.set(true)
  },
  'click #toAddress'(event, templateInstance) {
    event.stopPropagation()
  },
  'click *:not(#toAddress)'(event, templateInstance) {
    templateInstance.showAddressBook.set(false)
  },
  'click #selectAddressByAddress'(event, templateInstance) {
    const address = event.target.innerText
    setAddress(templateInstance, address)
  },
  'click #selectAddressByName'(event, templateInstance) {
    const address = Meteor.user().addressBook.filter(
      item => item.name === event.target.innerText
    )[0].address
    setAddress(templateInstance, address)
  }
})

Template.historyEntry.onCreated(function() {
  this.id = guid()
  this.addressBookFormTemplate = getAddressBookAddTemplate(this.id)
})
Template.historyEntry.onRendered(function historyEntryOnRendered() {
  // only show address book popovers when we are connected to the server,
  // ie. not running MetaMask
  if (typeof web3 === 'undefined') {
    initializeAddressBookAddPopovers(this)
    const self = this
    $(document).on('submit', `#${this.id}`, function(e) {
      e.preventDefault()
      const { addressBookName } = e.target
      Meteor.call(
        'insertAddressBookEntry',
        addressBookName.value,
        self.data.peer,
        (error, result) => {
          if (error) {
            toggleNotification()
          }

          // This ungly hack to access the parent template is necessary since it
          // is not possible to move the content of the historyEntry template to
          // the limmatCoinTemplate, because the onRendered function of
          // limmatCoin fires before the content of all historyEntrys is loaded
          // and so the popovers won't work.
          Meteor.call('getTransactionList', 'lmc', 20, (error, result) => {
            self.view.parentView.parentView.parentView
              .templateInstance()
              .transactionList.set(result)
          })
        }
      )
      $('[data-toggle="popover"]').popover('hide')
    })
  }
})

function initializeAddressBookAddPopovers(templateInstance) {
  $('[data-toggle="popover"]').popover({
    container: 'body',
    html: true,
    content: templateInstance.addressBookFormTemplate,
    title: 'Add to address book'
  })
  $('[data-toggle="popover"]#peerName').popover({
    container: 'body',
    html: true,
    content: templateInstance.addressBookFormTemplate,
    title: 'Change name'
  })
  $('#__blaze-root')
    .on('click', function(e) {
      if (
        $(e.target).data('toggle') !== 'popover' &&
        $(e.target).parents('.popover.in').length === 0
      ) {
        $('[data-toggle="popover"]').popover('hide')
      }
    })
    .on('hidden.bs.popover', function(e) {
      $(e.target).data('bs.popover').inState.click = false
    })
}

function toggleNotification() {
  $('.alert').addClass('in out')
  Meteor.setTimeout(() => {
    $('.alert').toggleClass('in out')
  }, 5000)
}

function getAddressBookAddTemplate(id) {
  return `
      <form id='${id}'>
          <div class='form-group'>
              <input class='form-control' type='text' name='addressBookName' placeholder='Name' required='required'/>
          </div>
          <div class='form-group'>
              <button type='submit' class='btn btn-primary'>Save</button>
          </div>
      </form>
      `
}

function validateAddressInput(templateInstance, input) {
  if (input.length === 42 && input.substring(0, 2) === '0x') {
    templateInstance.addressIsValid.set(true)
  } else {
    templateInstance.addressIsValid.set(false)
  }
}

function setAddress(templateInstance, address) {
  validateAddressInput(templateInstance, address)
  templateInstance.find('#toAddress').value = address
}
