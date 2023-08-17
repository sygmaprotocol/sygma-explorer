import { FastifyReply, FastifyRequest } from "fastify"
import { ITransfer, ITransferById, ITransferBySender } from "../Interfaces"
import { logger } from "../utils/logger"

import TransfersService from "../services/transfers.service"
import CoinMarketCapService from "../services/coinmarketcap.service"
import { NotFound } from "../utils/helpers"

const transfersService = new TransfersService()
const coinMarketCapServiceInstance = new CoinMarketCapService(
  process.env.COINMARKETCAP_API_KEY as string,
  process.env.COINMARKETCAP_API_URL as string,
  JSON.parse(process.env.TOKEN_SYMBOLS!) as Array<{ id: number; symbol: string }>,
)

export const TransfersController = {
  transfers: async function (request: FastifyRequest<{ Querystring: ITransfer }>, reply: FastifyReply): Promise<void> {
    try {
      const {
        query: { page, limit, status },
      } = request

      const transfersResult = await transfersService.findTransfersByCursor({
        page,
        limit,
        status,
      })

      const transfersWithValue = await coinMarketCapServiceInstance.appendConvertedAmountValueToTransfers(transfersResult)

      void reply.status(200).send(transfersWithValue)
    } catch (e) {
      logger.error(e)
      void reply.status(500)
    }
  },
  transferById: async function (request: FastifyRequest<{ Params: ITransferById }>, reply: FastifyReply): Promise<void> {
    const { id } = request.params

    try {
      const transfer = await transfersService.findTransferById({ id })

      const { amount, toDomainId } = transfer

      if (amount !== null && toDomainId !== null) {
        const convertedValue = await coinMarketCapServiceInstance.appendConvertedAmountValueToTransfer(amount, toDomainId)
        void reply.status(200).send({ ...transfer, convertedValue })
      } else {
        void reply.status(200).send(transfer)
      }
    } catch (e) {
      if (e instanceof NotFound) {
        void reply.status(404)
      } else {
        logger.error(e)
        void reply.status(500)
      }
    }
  },
  transferBySender: async function (
    request: FastifyRequest<{ Params: ITransferBySender; Querystring: ITransfer }>,
    reply: FastifyReply,
  ): Promise<void> {
    const {
      params: { senderAddress },
    } = request
    const {
      query: { page, limit, status },
    } = request

    try {
      const transfers = await transfersService.findTransferByFilterParams({ page, limit, status, sender: senderAddress })

      const transfersWithValue = await coinMarketCapServiceInstance.appendConvertedAmountValueToTransfers(transfers)

      void reply.status(200).send(transfersWithValue)
    } catch (e) {
      logger.error(e)
      void reply.status(500)
    }
  },
}
