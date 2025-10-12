import {
  type Address,
  createWalletClient,
  http,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { secondaryMarketAbi } from "./secondary-market.abi.js";

// const salt = BigInt(Date.now()).toString();
const salt = "harun";
console.info(`salt: ${salt}`);

const config = {
  secondaryMarketAddress:
    "0x9ED36dd97796bA008677474b8920eba1649e1a91" as Address,
  makerPrivateKey: "0x0000" as Hex,
  makerTokenAddress: "0x30a6D5ED29ee93782C780C831398081110f1315C" as Address,
  takerTokenAddress: "0x7b665edd9c725cFBfD9411b73eE88c35Da9a46AF" as Address,
  makerAmount: parseUnits("1", 18),
  takerAmount: parseUnits("1", 18),
  salt: salt,
  chain: baseSepolia,
  rpcUrl: "https://sepolia.base.org",
};

(async () => {
  const makerAccount = privateKeyToAccount(config.makerPrivateKey);

  const order = {
    maker: makerAccount.address,
    makerToken: config.makerTokenAddress,
    makerAmount: config.makerAmount,
    takerToken: config.takerTokenAddress,
    takerAmount: config.takerAmount,
    salt: config.salt,
  };

  const walletClient = createWalletClient({
    account: makerAccount,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const hash = await walletClient.writeContract({
    address: config.secondaryMarketAddress,
    abi: secondaryMarketAbi,
    functionName: "cancelOrder",
    args: [order],
  });

  console.log("Order cancelled:", hash);
})();
