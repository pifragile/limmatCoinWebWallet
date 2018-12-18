import './home.html'
import '../../components/limmat-coin/limmat-coin'
import { ReactiveVar } from 'meteor/reactive-var'
import { Template } from 'meteor/templating'

Template.App_home.onCreated(function appHomeOnCreated() {
  this.web3ActiveInBrowser = new ReactiveVar(typeof web3 !== 'undefined')
})
Template.App_home.helpers({
  web3ActiveInBrowser() {
    return Template.instance().web3ActiveInBrowser.get()
  }
})
