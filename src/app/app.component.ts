import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { BigNumber, Contract, ethers, utils, Wallet } from 'ethers';
import { Address } from 'src/dtos/Address';
import { RequestTokens } from 'src/dtos/RequestToken.dto';
import { ReturnTokens } from 'src/dtos/ReturnTokens.dto';
import tokenJson from "../assets/MyToken.json";

const TOKEN_ADDRESS_API_URL = 'http://localhost:3000/contract-address';
const TOKEN_MINT_API_CALL = 'http://localhost:3000/request-tokens';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  provider: ethers.providers.BaseProvider;
  blockNumber: number | string | undefined;
  userWallet: Wallet | undefined;
  userBalance: number | undefined;
  userTokenBalance: number | undefined;
  tokenContractAddress: string | undefined;
  tokenContract: Contract | undefined;
  tokenSupply: number | undefined;
  tokenRequestTx: string | undefined;

  constructor(private http: HttpClient) {
    this.provider = ethers.providers.getDefaultProvider('goerli');
  }

  syncBlock() {
    this.blockNumber = 'Loading...';
    this.provider.getBlock('latest').then((block) => {
      this.blockNumber = block.number;
    });
    this.http.get<Address>(TOKEN_ADDRESS_API_URL)
      .subscribe((response) => {
        this.tokenContractAddress = response.address;
        this.getTokenInfo();
      });
  }

  getTokenInfo() {
    if (!this.tokenContractAddress) return;
    this.tokenContract = new Contract(
      this.tokenContractAddress,
      tokenJson.abi,
      this.userWallet ?? this.provider
    )
    this.tokenContract['totalSupply']().then((tokenSupplyBN: BigNumber) => {
      const tokenSupplyStr = utils.formatEther(tokenSupplyBN);
      this.tokenSupply = parseFloat(tokenSupplyStr);
    });
  }

  clearBlock() {
    this.blockNumber = undefined;
  }

  createWallet() {
    this.userWallet = Wallet.createRandom().connect(this.provider);
    this.userWallet.getBalance().then((balanceBN) => {
      const balanceStr = utils.formatEther(balanceBN);
      this.userBalance = parseFloat(balanceStr);
      this.tokenContract?.['balanceOf'](this.userWallet?.address).then((tokenBalanceBN: BigNumber) => {
          const tokenBalaceStr = utils.formatEther(tokenBalanceBN);
          this.userTokenBalance = parseFloat(tokenBalaceStr);
      });
    });
  }

  requestTokens(value: string) {
    if(!this.userWallet) return;
    const body = new RequestTokens(this.userWallet.address, value);
    this.http.post<ReturnTokens>(TOKEN_MINT_API_CALL, body).subscribe((response) => {
      //todo
      this.userTokenBalance = response.amount;
      this.tokenRequestTx = response.txHash;
    });
  }
}

// TODO
// Connect metamask injected provider
// Request ballot contract from backend
// Add frontend function to delegate votes (token contract), cast votes (ballot), and query voting power (ballot), query votes cast (ballot)
