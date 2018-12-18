import { ERC20Contract } from './erc20-contract'
import { web3 } from '.'

const limmatCoinAbiRaw = Assets.getText('ethereum/contracts/lmc/lmcAbi.json')

export const contracts = {
  lmc: new ERC20Contract(
    web3,
    limmatCoinAbiRaw,
    Meteor.settings.public.contracts.lmc
  )
}
