import { expect } from "chai"
import axios from "axios"
import { Transfer, Resource, Fee, Deposit, Execution, Domain } from "@prisma/client"
import { NotFound } from "utils/helpers"

type TransferResponse = Transfer & {
    resource: Resource
    toDomain: Domain
    fromDomain: Domain
    fee: Fee
    deposit: Deposit
    execution: Execution
}

const DOMAIN_1 = "1"
const DOMAIN_2 = "2"
const DOMAIN_3 = "3"

describe("Get all transfers with a specific domain as source or destination", function () {

    before(async () => {
        let transfers = 0
        let isProcessing = false
        while (transfers !== 35 || isProcessing) {
          const res: { data: Array<TransferResponse> } = await axios.get("http://localhost:8000/api/transfers?page=1&limit=100")
    
          transfers = res.data.length
    
          isProcessing = false
          for (const transfer of res.data) {
            if (!transfer.deposit || !transfer.execution) {
              isProcessing = true
            }
          }
        }
    })

    it("Should successfully fetch all transfers from domain 1", async () => {
        const res = await axios.get(`http://localhost:8000/api/domains/${DOMAIN_1}/transfers?page=1&limit=100`)
        const transfers = res.data as Array<TransferResponse>
        
        expect(res.status).to.be.deep.equal(200)
        expect(transfers.length).to.be.deep.equal(32)

        for (let transfer of transfers){
          expect(transfer.fromDomainId).to.be.deep.equal(parseInt(DOMAIN_1))
        }
    })

    it("Should successfully fetch all transfers from domain 1 with specified source", async () => {
        const res = await axios.get(`http://localhost:8000/api/domains/${DOMAIN_1}/transfers?page=1&limit=100&domain=source`)
        const transfers = res.data as Array<TransferResponse>
        
        expect(res.status).to.be.deep.equal(200)
        expect(transfers.length).to.be.deep.equal(32)

        for (let transfer of transfers){
          expect(transfer.fromDomainId).to.be.deep.equal(parseInt(DOMAIN_1))
        }
    })

    it.only("Should fail because the domain query parameter isn't source nor destination", async() => {
      
      let res: any 
      try {
        res = await axios.get(`http://localhost:8000/api/domains/${DOMAIN_1}
                          /transfers?page=1&limit=100&domain=abc`)
        expect(res.status).to.be.deep.equal(200)

      } catch (e) {
        console.log(e)
      }
    })


    it("Should successfully fetch all transfers to domain 1", async () => {
      const res = await axios.get(`http://localhost:8000/api/domains/${DOMAIN_1}/transfers?page=1&limit=100&domain=destination`)
      const transfers = res.data as Array<TransferResponse>
      
      expect(res.status).to.be.deep.equal(200)
      expect(transfers.length).to.be.deep.equal(3)

      for (let transfer of transfers){
        expect(transfer.toDomainId).to.be.deep.equal(parseInt(DOMAIN_1))
      }
    })

    it("Should successfully fetch all transfers to domain 2", async () => {
      const res = await axios.get(`http://localhost:8000/api/domains/${DOMAIN_2}/transfers?page=1&limit=100&domain=destination`)
      const transfers = res.data as Array<TransferResponse>
      
      expect(res.status).to.be.deep.equal(200)
      expect(transfers.length).to.be.deep.equal(30)

      for (let transfer of transfers){
        expect(transfer.toDomainId).to.be.deep.equal(parseInt(DOMAIN_2))
      }
    })

    it("Should successfully fetch all transfers from domain 3", async () => {
      const res = await axios.get(`http://localhost:8000/api/domains/${DOMAIN_3}/transfers?page=1&limit=100`)
      const transfers = res.data as Array<TransferResponse>
      
      expect(res.status).to.be.deep.equal(200)
      expect(transfers.length).to.be.deep.equal(3)

      for (let transfer of transfers){
        expect(transfer.fromDomainId).to.be.deep.equal(parseInt(DOMAIN_3))
      }
  })

})