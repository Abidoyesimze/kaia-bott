import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    klaytn: {
      chainId: 1001,
      url: process.env.RPC_URL || "", // Use an environment variable for the RPC URL
    },
  },
  etherscan: {
    apiKey: {
      klaytn: "unnecessary", 
    },
    customChains: [
      {
        network: "klaytn",
        chainId: 1001,
        urls: {
          apiURL: "https://api-baobab.klaytnscope.com/api", 
          browserURL: "https://kairos.kaiascope.com", 
        },
      },
    ],
  },
};

export default config;
