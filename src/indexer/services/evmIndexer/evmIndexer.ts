import { Domain, Resource } from "indexer/config"
import { ethers, Provider } from "ethers"
import DomainRepository from "indexer/repository/domain"
import { ObjectId } from "mongodb"

import DepositRepository from "indexer/repository/deposit"
import TransferRepository from "indexer/repository/transfer"
import ExecutionRepository from "indexer/repository/execution"
import { TransferStatus } from "@prisma/client"
import FeeRepository from "indexer/repository/fee"
import { logger } from "../../../utils/logger"
import { getLogs } from "./evmfilter"
import { DecodedLogs } from "./evmTypes"
import { decodeLogs } from "./evmEventParser"

export class EvmIndexer {
  private provider: Provider
  private pastEventsQueryInterval = 1000
  private currentEventsQueryInterval = 10
  private domainRepository: DomainRepository
  private depositRepository: DepositRepository
  private transferRepository: TransferRepository
  private executionRepository: ExecutionRepository
  private feeRepository: FeeRepository
  private domain: Domain
  private resourceMap: Map<string, Resource>
  constructor(
    domain: Domain,
    rpcURL: string,
    domainRepository: DomainRepository,
    depositRepository: DepositRepository,
    transferRepository: TransferRepository,
    executionRepository: ExecutionRepository,
    feeRepository: FeeRepository,
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcURL)
    this.domainRepository = domainRepository
    this.domain = domain
    this.depositRepository = depositRepository
    this.transferRepository = transferRepository
    this.executionRepository = executionRepository
    this.feeRepository = feeRepository

    this.resourceMap = new Map<string, Resource>()
    domain.resources.map((resource: Resource) => this.resourceMap.set(resource.resourceId, resource))
  }

  async indexPastEvents(): Promise<number> {
    const lastIndexedBlock = await this.getLastIndexedBlock(this.domain.id.toString())

    let toBlock = this.domain.startBlock + this.pastEventsQueryInterval

    let latestBlock = await this.provider.getBlockNumber()

    let fromBlock = this.domain.startBlock

    if (lastIndexedBlock && lastIndexedBlock > this.domain.startBlock) {
      // move 1 block from last processed db block
      fromBlock = lastIndexedBlock + 1
    }
    logger.info(`Starting querying past blocks on ${this.domain.name}, domainID: ${this.domain.id}`)
    do {
      try {
        latestBlock = await this.provider.getBlockNumber()
        // check block range for getting logs query exceeds latestBlock on network
        // if true -> get logs until that block, else query next range of blocks
        if (fromBlock + this.pastEventsQueryInterval >= latestBlock) {
          toBlock = latestBlock
        } else {
          toBlock = fromBlock + this.pastEventsQueryInterval
        }

        const logs = await getLogs(this.provider, this.domain, fromBlock, toBlock)
        if (logs.length > 0) {
          logger.debug(`Found past events on ${this.domain.name} in block range [${fromBlock}-${toBlock}]`)
        }
        const decodedLogs = await decodeLogs(this.provider, this.domain, logs, this.resourceMap)

        await this.saveDataToDb(decodedLogs, this.domain.id, toBlock.toString(), this.domain.name)
        // move to next range of blocks
        fromBlock += this.pastEventsQueryInterval
        toBlock += this.pastEventsQueryInterval
      } catch (error) {
        logger.error(`Failed to process past events because of: ${(error as Error).message}`)
      }
    } while (fromBlock < latestBlock)
    // move to next block from the last queried range in past events
    return latestBlock + 1
  }

  async listenToEvents(): Promise<void> {
    logger.info(`Starting querying blocks for events on ${this.domain.name}, domainID: ${this.domain.id}`)
    let latestBlock = await this.indexPastEvents()
    await this.provider.on("block", (currentBlock: number): void => {
      const handleBlockEvent = async (): Promise<void> => {
        // start at last block from past events query and move to new blocks range
        if (latestBlock + this.currentEventsQueryInterval === currentBlock) {
          // connect executions to deposits
          try {
            // fetch and decode logs
            const logs = await getLogs(this.provider, this.domain, latestBlock, currentBlock)
            if (logs.length > 0) {
              logger.debug(`Found past events on ${this.domain.name} in block range [${latestBlock}-${currentBlock}]`)
            }
            const decodedLogs = await decodeLogs(this.provider, this.domain, logs, this.resourceMap)
            await this.saveDataToDb(decodedLogs, this.domain.id, currentBlock.toString(), this.domain.name)
            // move to next range of blocks
            latestBlock += this.currentEventsQueryInterval
            return
          } catch (error) {
            logger.error(`Failed to process current events because of: ${(error as Error).message}`)
          }
          return undefined
        }
      }
      void handleBlockEvent()
    })
  }

  async saveDataToDb(decodedLogs: DecodedLogs, domainID: number, latestBlock: string, domainName: string): Promise<void> {
    try {
      const transferMap = new Map<string, string>()

      await Promise.all(
        decodedLogs.deposit.map(async decodedLog => {
          let transfer = await this.transferRepository.findByNonce(decodedLog.depositNonce, decodedLog.toDomainId)

          if (!transfer) {
            transfer = await this.transferRepository.insertDepositTransfer(decodedLog)
          } else {
            await this.transferRepository.updateTransfer(decodedLog, transfer.id)
          }

          const deposit = {
            id: new ObjectId().toString(),
            type: decodedLog.transferType,
            txHash: decodedLog.txHash,
            blockNumber: decodedLog.blockNumber.toString(),
            depositData: decodedLog.depositData,
            handlerResponse: decodedLog.handlerResponse,
            transferId: transfer.id,
          }
          await this.depositRepository.insertDeposit(deposit)

          transferMap.set(decodedLog.txHash, transfer.id)
        }),
      )
      await Promise.all(
        decodedLogs.feeCollected.map(async fee => {
          const feeData = {
            id: new ObjectId().toString(),
            transferId: transferMap.get(fee.txHash) || "",
            tokenSymbol: fee.tokenSymbol,
            tokenAddress: fee.tokenAddress,
            amount: fee.amount,
          }
          await this.feeRepository.insertFee(feeData)
        }),
      )

      await Promise.all(
        decodedLogs.proposalExecution.map(async decodedLog => {
          let transfer = await this.transferRepository.findByNonce(decodedLog.depositNonce, decodedLog.fromDomainId || "")
          if (!transfer) {
            transfer = await this.transferRepository.insertExecutionTransfer(decodedLog)
          } else {
            await this.transferRepository.updateStatus(TransferStatus.executed, transfer.id)
          }

          const execution = {
            id: new ObjectId().toString(),
            transferId: transfer.id,
            type: decodedLog.transferType,
            txHash: decodedLog.txHash,
            blockNumber: decodedLog.blockNumber.toString(),
          }
          await this.executionRepository.insertExecution(execution)
        }),
      )

      await Promise.all(
        decodedLogs.errors.map(async error => {
          let transfer = await this.transferRepository.findByNonce(error.depositNonce, error.domainId.toString())
          if (!transfer) {
            transfer = await this.transferRepository.insertFailedTransfer(error)
          } else {
            await this.transferRepository.updateStatus(TransferStatus.failed, transfer.id)
          }

          const execution = {
            id: new ObjectId().toString(),
            transferId: transfer.id,
            txHash: error.txHash,
            blockNumber: error.blockNumber.toString(),
            type: null,
          }
          await this.executionRepository.insertExecution(execution)
        }),
      )
    } catch (error) {
      logger.error(`Failed saving data because of: ${(error as Error).message}`)
    }

    logger.info(`save block on ${domainName}: ${latestBlock}, domainID: ${domainID}`)
    await this.domainRepository.updateBlock(latestBlock, domainID)
  }

  async getLastIndexedBlock(domainID: string): Promise<number> {
    const domainRes = await this.domainRepository.getLastIndexedBlock(domainID)

    return domainRes ? Number(domainRes.lastIndexedBlock) : 0
  }
}
