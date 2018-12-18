import InputDataDecoder from 'ethereum-input-data-decoder'
import Tx from 'ethereumjs-tx'
import Utils from 'web3-utils'
import { toAsync, promisify } from '../utils'

export class ERC20Contract {
  constructor(web3, abiRaw, config) {
    const abi = JSON.parse(abiRaw).abi
    this.inputDataDecoder = new InputDataDecoder(abi)
    this.contract = web3.eth.contract(abi).at(config.address)
    this.messageCapable = !!this.contract.transferWithMessage
    this.config = config
    this.toHex = toAsync(web3.toHex)
    this.web3 = web3
  }
  async transferWithMessage(from, to, amount, message) {
    if (this.getBalance(from.address) < amount) {
      console.log('insufficient balance', from, to, amount, message)
      return
    }
    if (!this.messageCapable) {
      console.log('contract not message capable', from, to, amount, message)
      return
    }
    const count = await toAsync(this.web3.eth.getTransactionCount)(from.address)
    const data = this.contract.transferWithMessage.getData(
      to,
      this.web3.toHex(await this.adjustAmtUp(amount)),
      message
    )
    const rawTransaction = this.getRawTransaction(from.address, count, data)
    if (Meteor.isClient) {
      await toAsync(this.web3.eth.sendTransaction)(rawTransaction)
    } else {
      this.signAndSendRawTransaction(from.privateKey, rawTransaction)
    }
  }

  async getBalance(addr) {
    return this.adjustAmtDown(
      (await toAsync(this.contract.balanceOf)(addr)).toNumber()
    )
  }

  async listTransactionsWithMessage(address, range = 20) {
    const filter = this.web3.eth.filter(this.getTransactionFilter())
    const log = await promisify(cb => filter.get(cb))
    const self = this
    return Promise.all(
      log
        .filter(function(event) {
          return (
            event.topics[0] ===
              self.config.signatureHashes.transferWithMessage &&
            (event.topics[2] === self.padAddress(address) ||
              event.topics[1] === self.padAddress(address))
          )
        })
        .reverse()
        .splice(0, range)
        .map(async function(event) {
          const inputs = self.inputDataDecoder.decodeData(
            (await toAsync(self.web3.eth.getTransaction)(event.transactionHash))
              .input
          ).inputs
          const isReceiver = event.topics[2] === self.padAddress(address)
          const message = inputs[2]
          const peer = isReceiver
            ? self.unPadAddress(event.topics[1])
            : self.unPadAddress(event.topics[2])
          const amount = isReceiver
            ? await self.adjustAmtDown(inputs[1].toNumber())
            : -(await self.adjustAmtDown(inputs[1].toNumber()))
          return {
            peer,
            amount,
            message
          }
        })
    )
  }

  async adjustAmtUp(amt) {
    return amt * Math.pow(10, await toAsync(this.contract.decimals)())
  }

  async adjustAmtDown(amt) {
    return amt / Math.pow(10, await toAsync(this.contract.decimals)())
  }

  padAddress(address) {
    return Utils.padLeft(address.toLowerCase(), 64)
  }

  unPadAddress(address) {
    return '0x' + address.substring(26, 66)
  }

  getTransactionFilter() {
    return {
      fromBlock: 0,
      toBlock: 'latest',
      address: this.config.address
    }
  }

  getRawTransaction(address, count, data) {
    return {
      from: address,
      nonce: this.web3.toHex(count),
      gasPrice: 0x0,
      gasLimit: this.web3.toHex(4500000),
      to: this.config.address,
      value: 0x0,
      data,
      chainId: this.web3.toHex(
        Meteor.settings.public.networks[Meteor.settings.public.activeNetwork]
          .chainId
      )
    }
  }

  signAndSendRawTransaction(privateKey, rawTransaction) {
    const privateKeyBuffer = new Buffer(privateKey.substring(2), 'hex')
    const rawEthereumJsTransaction = new Tx(rawTransaction)
    rawEthereumJsTransaction.sign(privateKeyBuffer)
    const serializedTx = rawEthereumJsTransaction.serialize()
    this.web3.eth.sendRawTransaction(
      '0x' + serializedTx.toString('hex'),
      function(err) {
        if (err) console.log(err)
      }
    )
  }
}
