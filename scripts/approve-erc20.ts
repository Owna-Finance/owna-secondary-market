import {
  erc20Abi,
  type Address,
  createWalletClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const config = {
  tokenAddress: "0x7b665edd9c725cFBfD9411b73eE88c35Da9a46AF" as Address,
  spenderAddress: "0xBB3c9651A962ec831f3E30F007ff2254a70f72bf" as Address,
  privateKey:
    "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  chain: baseSepolia,
  rpcUrl: "https://sepolia.base.org",
  amount: parseUnits("10", 18),
};

(async () => {
  const account = privateKeyToAccount(config.privateKey);
  const transport = http(config.rpcUrl);

  const walletClient = createWalletClient({
    account,
    chain: config.chain,
    transport,
  });

  try {
    const hash = await walletClient.writeContract({
      address: config.tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [config.spenderAddress, config.amount],
    });

    console.log("Approval success: ", hash);
  } catch (error) {
    console.error("❌ Gagal melakukan approval:", error);
  }
})();
