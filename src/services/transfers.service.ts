import { PrismaClient, Transfer, TransferStatus } from "@prisma/client"
import { returnQueryParamsForTransfers } from "../utils/helpers"

type AllTransfersOption = {
  page: string
  limit: string
  status?: string
}

export type Filters = {
  fromAddress?: string
  toAddress?: string
  depositTransactionHash?: string
  fromDomainId?: string
  toDomainId?: string
}

export type TransfersByCursorOptions = {
  page: string
  limit: string
  status?: TransferStatus
}

class TransfersService {
  public transfers = new PrismaClient().transfer
  private currentCursor: string | undefined

  public async findTransfersByCursor(args: TransfersByCursorOptions): Promise<Transfer[]> {
    const { page, limit, status } = args

    const pageSize = parseInt(limit, 10)
    const pageIndex = parseInt(page, 10) - 1
    const skip = pageIndex * pageSize

    const where = status ? { status } : undefined;

    const transfers = await this.transfers.findMany({
      where,
      take: pageSize + 1,
      skip: this.currentCursor ? 0 : skip,
      cursor: this.currentCursor ? { id: this.currentCursor } : undefined,
      orderBy: [
        {
          timestamp: "asc",
        },
      ],
      include: {
        ...returnQueryParamsForTransfers().include,
      },
    })

    const transferWithoutTheLastItem = transfers.slice(0, pageSize)

    return transferWithoutTheLastItem
  }
}
export default TransfersService
