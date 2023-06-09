import {
  Bridge as BridgeType,
  BasicFeeHandler as BasicFeeHandlerType,
  FeeHandlerWithOracle as FeeHandlerWithOracleType,
  ERC20Handler as ERC20HandlerType,
  ERC721Handler as ERC721HandlerType,
  GenericHandler as GenericHandlerType,
} from "@chainsafe/chainbridge-contracts"
import { Contract } from "ethers"

export * from "./contract"
export type Bridge = BridgeType & Contract
export type BasicFeeHandler = BasicFeeHandlerType & Contract
export type FeeHandlerWithOracle = FeeHandlerWithOracleType & Contract
export type ERC20Handler = ERC20HandlerType & Contract
export type ERC721Handler = ERC721HandlerType & Contract
export type GenericHandler = GenericHandlerType & Contract