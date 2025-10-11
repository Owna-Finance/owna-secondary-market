import {
  type Address,
  createWalletClient,
  http,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const config = {
  secondaryMarketAddress:
    "0xBB3c9651A962ec831f3E30F007ff2254a70f72bf" as Address,
  makerPrivateKey:
    "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  takerPrivateKey:
    "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  makerTokenAddress: "0x30a6D5ED29ee93782C780C831398081110f1315C" as Address,
  takerTokenAddress: "0x7b665edd9c725cFBfD9411b73eE88c35Da9a46AF" as Address,
  makerAmount: parseUnits("10", 18),
  takerAmount: parseUnits("10", 18),
  salt: BigInt(Date.now()),
  chain: baseSepolia,
  rpcUrl: "https://sepolia.base.org",
};

const contractAbi = [
  {
    type: "function",
    name: "executeSwap",
    inputs: [
      {
        name: "_order",
        type: "tuple",
        components: [
          { name: "maker", type: "address" },
          { name: "makerToken", type: "address" },
          { name: "makerAmount", type: "uint256" },
          { name: "takerToken", type: "address" },
          { name: "takerAmount", type: "uint256" },
          { name: "salt", type: "uint256" },
        ],
      },
      { name: "_signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

(async () => {
  const makerAccount = privateKeyToAccount(config.makerPrivateKey);
  const takerAccount = privateKeyToAccount(config.takerPrivateKey);

  const order = {
    maker: makerAccount.address,
    makerToken: config.makerTokenAddress,
    makerAmount: config.makerAmount,
    takerToken: config.takerTokenAddress,
    takerAmount: config.takerAmount,
    salt: config.salt,
  };

  const domain = {
    name: "SecondaryMarket",
    version: "1",
    chainId: config.chain.id,
    verifyingContract: config.secondaryMarketAddress,
  };

  const types = {
    SwapOrder: [
      { name: "maker", type: "address" },
      { name: "makerToken", type: "address" },
      { name: "makerAmount", type: "uint256" },
      { name: "takerToken", type: "address" },
      { name: "takerAmount", type: "uint256" },
      { name: "salt", type: "uint256" },
    ],
  };

  const signature = await makerAccount.signTypedData({
    domain,
    types,
    primaryType: "SwapOrder",
    message: order,
  });

  const walletClient = createWalletClient({
    account: takerAccount,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const hash = await walletClient.writeContract({
    address: config.secondaryMarketAddress,
    abi: contractAbi,
    functionName: "executeSwap",
    args: [order, signature],
  });

  console.log("Swap executed:", hash);
})();
