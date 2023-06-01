import { PrismaClient, Transfer, TransferStatus } from "@prisma/client"
import { DecodedDepositLog, DecodedFailedHandlerExecution, DecodedProposalExecutionLog } from "indexer/services/evmIndexer/evmTypes"
import { ObjectId } from "mongodb"

export type TransferMetadataeta = {
  id: string
  depositNonce: number
  sender: string
  amount: string
  destination: string
  fromDomainId: string
  toDomainId: string
  resourceID: string

  resource: {
    connect: {
      id: string
    }
  }
  fromDomain: {
    connect: {
      id: string
    }
  }
  toDomain: {
    connect: {
      id: string
    }
  }
}
class TransferRepository {
  public transfer = new PrismaClient().transfer

  public async insertDepositTransfer(decodedLog: DecodedDepositLog, ofacComply: boolean): Promise<Transfer> {
    const transferData = {
      id: new ObjectId().toString(),
      depositNonce: decodedLog.depositNonce,
      // type: decodedLog.transferType,
      sender: decodedLog.sender,
      amount: decodedLog.amount,
      destination: decodedLog.destination,
      status: TransferStatus.pending,
      resource: {
        connect: {
          id: decodedLog.resourceID,
        },
      },
      fromDomain: {
        connect: {
          id: decodedLog.fromDomainId,
        },
      },
      toDomain: {
        connect: {
          id: decodedLog.toDomainId,
        },
      },
      timestamp: decodedLog.timestamp,
      ofacComply,
    }
    return await this.transfer.create({ data: transferData })
  }

  public async insertExecutionTransfer(decodedLog: DecodedProposalExecutionLog): Promise<Transfer> {
    const transferData = {
      id: new ObjectId().toString(),
      depositNonce: decodedLog.depositNonce,
      fromDomainId: decodedLog.fromDomainId,
      timestamp: decodedLog.timestamp,
      status: TransferStatus.executed,
      resourceID: decodedLog.resourceID,
      toDomainId: null,
      sender: null,
      destination: null,
      amount: null,
    }
    return await this.transfer.create({ data: transferData })
  }

  public async insertFailedTransfer(decodedLog: DecodedFailedHandlerExecution): Promise<Transfer> {
    const transferData = {
      id: new ObjectId().toString(),
      depositNonce: decodedLog.depositNonce,

      fromDomainId: decodedLog.domainId,

      status: TransferStatus.failed,
    }
    return await this.transfer.create({ data: transferData })
  }

  public async updateTransfer(decodedLog: DecodedDepositLog, id: string, ofacComply: boolean): Promise<Transfer> {
    const transferData = {
      depositNonce: decodedLog.depositNonce,
      // type: decodedLog.transferType,
      sender: decodedLog.sender,
      amount: decodedLog.amount,
      destination: decodedLog.destination,
      resource: {
        connect: {
          id: decodedLog.resourceID,
        },
      },
      fromDomain: {
        connect: {
          id: decodedLog.fromDomainId,
        },
      },
      toDomain: {
        connect: {
          id: decodedLog.toDomainId,
        },
      },
      timestamp: decodedLog.timestamp,
      ofacComply,
    }
    return await this.transfer.update({ where: { id: id }, data: transferData })
  }

  public async findByNonce(nonce: number, domainId: string): Promise<Transfer | null> {
    return await this.transfer.findFirst({
      where: {
        depositNonce: nonce,
        fromDomainId: domainId,
      },
    })
  }

  public async updateStatus(status: TransferStatus, id: string): Promise<Transfer> {
    return await this.transfer.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    })
  }
}

export default TransferRepository
