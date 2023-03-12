import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { BigNumber, Contract, ethers, utils, Wallet } from 'ethers';
import { ExternalProvider } from "@ethersproject/providers";
import { Address } from 'src/dtos/Address';
import { RequestTokens } from 'src/dtos/RequestToken.dto';
import { ReturnTokens } from 'src/dtos/ReturnTokens.dto';
import tokenJson from "../assets/MyToken.json";
import ballotJson from "../assets/Ballot.json";

// Metamask will inject the ethereum object to DOM
declare global {
  interface Window {
    ethereum: ExternalProvider;
  }
}

const TOKEN_ADDRESS_API_URL = 'http://localhost:3000/token-address';
const BALLOT_ADDRESS_API_URL = 'http://localhost:3000/ballot-address';
const TOKEN_MINT_API_CALL = 'http://localhost:3000/request-tokens';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  provider: ethers.providers.Web3Provider
  blockNumber: number | string | undefined;
  signer: ethers.providers.JsonRpcSigner | undefined;
  userAddress: string | undefined;
  userBalance: number | undefined;
  userTokenBalance: number | undefined;
  tokenContractAddress: string | undefined;
  tokenContract: Contract | undefined;
  tokenSupply: number | undefined;
  tokenRequestTx: string | undefined;
  ballotContractAddress: string | undefined;
  ballotContract: Contract | undefined;
  userVotingPower: number | undefined;
  userVotesCast: number | undefined;

  constructor(private http: HttpClient) {
    this.provider = new ethers.providers.Web3Provider(window.ethereum, 'goerli');
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

  syncBallot() {
    this.http.get<Address>(BALLOT_ADDRESS_API_URL)
      .subscribe((response) => {
        this.ballotContractAddress = response.address;
        this.getBallotInfo();
    });
  }

  getTokenInfo() {
    if (!this.tokenContractAddress) return;
    this.tokenContract = new Contract(
      this.tokenContractAddress,
      tokenJson.abi,
      this.signer ?? this.provider
    )
    this.tokenContract['totalSupply']().then((tokenSupplyBN: BigNumber) => {
      const tokenSupplyStr = utils.formatEther(tokenSupplyBN);
      this.tokenSupply = parseFloat(tokenSupplyStr);
    });
  }

  getBallotInfo() {
    if (!this.ballotContractAddress) return;
    this.ballotContract = new Contract(
      this.ballotContractAddress,
      ballotJson.abi,
      this.signer ?? this.provider
    )
    this.ballotContract['votingPower'](this.userAddress).then((votingPowerBN: BigNumber) => {
      const votingPowerStr = utils.formatEther(votingPowerBN);
      this.userVotingPower = parseFloat(votingPowerStr);
    });
    this.ballotContract['votesCast'](this.userAddress).then((votesBN: BigNumber) => {
      const votesStr = utils.formatEther(votesBN);
      this.userVotesCast = parseFloat(votesStr);
    });
  }

  clearBlock() {
    this.blockNumber = undefined;
  }

  connectWallet() {
    // Request the signer to connect
    this.provider.send("eth_requestAccounts", []).then(() => {
      this.signer = this.provider.getSigner();
      // query account balance
      this.signer.getBalance().then((balanceBN) => {
        const balanceStr = utils.formatEther(balanceBN);
        this.userBalance = parseFloat(balanceStr);
      });
      // get the signer address
      this.signer.getAddress().then((address) => {
        this.userAddress = address;
        // query MTK balance 
        this.tokenContract?.['balanceOf'](this.userAddress).then((tokenBalanceBN: BigNumber) => {
          const tokenBalaceStr = utils.formatEther(tokenBalanceBN);
          this.userTokenBalance = parseFloat(tokenBalaceStr);
        });
      });
    });
  }

  requestTokens(value: string) {
    if(!this.userAddress) return;
    const body = new RequestTokens(this.userAddress, value);
    this.http.post<ReturnTokens>(TOKEN_MINT_API_CALL, body).subscribe((response) => {
      this.userTokenBalance = response.amount;
      this.tokenRequestTx = response.txHash;
    });
  }

  selfDelegate() {
    if(!this.tokenContract || !this.signer) return;
    this.tokenContract.connect(this.signer)['delegate'](this.userAddress).then((tx: ethers.ContractTransaction) => {
      tx.wait().then((receipt: ethers.ContractReceipt) => {
        this.syncBallot();
      })
    });
  }
}

// TODO
// Add frontend function to delegate votes (token contract), cast votes (ballot), query votes cast (ballot)
