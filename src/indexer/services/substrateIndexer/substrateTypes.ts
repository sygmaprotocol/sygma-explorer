export type RawProposalExecutionData = { originDomainId: string; depositNonce: string; dataHash: string }

export type RawDepositData = {
  destDomainId: string
  resourceId: string
  depositNonce: string
  sender: string
  transferType: string
  depositData: string
  handlerResponse: string
}

export type RawFailedHandlerExecutionData = Omit<RawProposalExecutionData, "dataHash"> & { error: string }

export type ProposalExecutionDataToSave = Omit<RawProposalExecutionData, "dataHash"> & {
  txIdentifier: string
  blockNumber: string
  timestamp: number
}

export type FailedHandlerExecutionToSave = Omit<RawProposalExecutionData, "dataHash"> & {
  error: string
  txIdentifier: string
  blockNumber: string
  timestamp: number
}

export type DepositDataToSave = RawDepositData & { txIdentifier: string; blockNumber: string; timestamp: number }

export type ProposalExecutionEvent = { event: { data: RawProposalExecutionData } }

export type DepositEvent = {
  event: {
    data: RawDepositData
  }
}

export type FailedHandlerExecutionEvent = {
  event: {
    data: RawFailedHandlerExecutionData
  }
}

export type SubstrateEvent = {
  event: {
    method: string
    section: string
  }
}

export enum SygmaPalleteEvents {
  ProposalExecution = "ProposalExecution",
  Deposit = "Deposit",
  FailedHandlerExecution = "FailedHandlerExecution",
}

export enum SubstrateTypeTransfer {
  Fungible = "fungible",
}