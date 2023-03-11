export class ReturnTokens {
    txHash: string;
    address: string;
    amount: number

    constructor(txHash: string, address: string, amount: number) {
        this.txHash = txHash;
        this.address = address;
        this.amount = amount;
    }
}