import Web3 from 'web3'

export const { host, port } = Meteor.settings.public.networks[
  Meteor.settings.public.activeNetwork
]
export const web3 = new Web3(
  new Web3.providers.HttpProvider(`http://${host}:${port}`)
)
