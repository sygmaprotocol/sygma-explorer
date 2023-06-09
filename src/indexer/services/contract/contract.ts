import { Contract, Provider } from "ethers"
import ERC20Contract from "@openzeppelin/contracts/build/contracts/ERC20.json"
import { ERC20 } from "@chainsafe/chainbridge-contracts"
import { BridgeABI } from "./constants"

import { Bridge } from "./index"

export function getBridgeContract(provider: Provider, bridgeAddress: string): Bridge {
  return new Contract(bridgeAddress, BridgeABI, provider) as Bridge
}

export function getERC20Contract(provider: Provider, contractAddress: string): ERC20 {
  return new Contract(contractAddress, ERC20Contract.abi, provider) as unknown as ERC20
}