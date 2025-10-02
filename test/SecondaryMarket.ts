import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { type Address, type WalletClient, parseEther } from "viem";

describe("SecondaryMarket", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer, maker, taker, other] = await viem.getWalletClients();

  let secondaryMarketAddress: Address;
  let tokenAAddress: Address;
  let tokenBAddress: Address;

  const domain = {
    name: "SecondaryMarket",
    version: "1",
    chainId: 0,
    verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
  };

  const types = {
    SwapOrder: [
      { name: "maker", type: "address" },
      { name: "makerToken", type: "address" },
      { name: "makerAmount", type: "uint256" },
      { name: "takerToken", type: "address" },
      { name: "takerAmount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  // Helper functions
  const getContracts = async () => ({
    market: await viem.getContractAt("SecondaryMarket", secondaryMarketAddress),
    tokenA: await viem.getContractAt("MockERC20", tokenAAddress),
    tokenB: await viem.getContractAt("MockERC20", tokenBAddress),
  });

  const approveTokens = async (
    tokenA: any,
    tokenB: any,
    makerAmount: bigint,
    takerAmount: bigint
  ) => {
    await tokenA.write.approve([secondaryMarketAddress, makerAmount], {
      account: maker.account,
    });
    await tokenB.write.approve([secondaryMarketAddress, takerAmount], {
      account: taker.account,
    });
  };

  const createSwapOrder = (
    makerAmount: bigint,
    takerAmount: bigint,
    nonce: bigint = 0n
  ) => ({
    maker: maker.account.address,
    makerToken: tokenAAddress,
    makerAmount,
    takerToken: tokenBAddress,
    takerAmount,
    nonce,
  });

  const signOrder = (swapOrder: any, signer: WalletClient = maker) =>
    signer.signTypedData({
      account: signer.account!,
      domain,
      types,
      primaryType: "SwapOrder",
      message: swapOrder,
    });

  const executeSwapAndWait = async (
    contract: any,
    swapOrder: any,
    signature: string
  ) => {
    const hash = await contract.write.executeSwap([swapOrder, signature], {
      account: taker.account,
    });
    return publicClient.waitForTransactionReceipt({ hash });
  };

  beforeEach(async function () {
    const secondaryMarket = await viem.deployContract("SecondaryMarket");
    secondaryMarketAddress = secondaryMarket.address;

    const tokenA = await viem.deployContract("MockERC20", [
      "Token A",
      "TKA",
      parseEther("1000000"),
    ]);
    tokenAAddress = tokenA.address;

    const tokenB = await viem.deployContract("MockERC20", [
      "Token B",
      "TKB",
      parseEther("1000000"),
    ]);
    tokenBAddress = tokenB.address;

    domain.chainId = await publicClient.getChainId();
    domain.verifyingContract = secondaryMarketAddress;

    await tokenA.write.mint([maker.account.address, parseEther("1000")]);
    await tokenB.write.mint([taker.account.address, parseEther("1000")]);
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const { market } = await getContracts();
      assert.ok(market);
    });

    it("should initialize with nonce 0 for any address", async function () {
      const { market } = await getContracts();
      const nonce = await market.read.getNonce([maker.account.address]);
      assert.equal(nonce, 0n);
    });
  });

  describe("executeSwap", function () {
    it("should execute swap successfully with valid signature", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      const [makerABefore, makerBBefore, takerABefore, takerBBefore] =
        await Promise.all([
          tokenA.read.balanceOf([maker.account.address]),
          tokenB.read.balanceOf([maker.account.address]),
          tokenA.read.balanceOf([taker.account.address]),
          tokenB.read.balanceOf([taker.account.address]),
        ]);

      await executeSwapAndWait(market, swapOrder, signature);

      const [makerAAfter, makerBAfter, takerAAfter, takerBAfter] =
        await Promise.all([
          tokenA.read.balanceOf([maker.account.address]),
          tokenB.read.balanceOf([maker.account.address]),
          tokenA.read.balanceOf([taker.account.address]),
          tokenB.read.balanceOf([taker.account.address]),
        ]);

      assert.equal(makerAAfter, (makerABefore as bigint) - makerAmount);
      assert.equal(makerBAfter, (makerBBefore as bigint) + takerAmount);
      assert.equal(takerAAfter, (takerABefore as bigint) + makerAmount);
      assert.equal(takerBAfter, (takerBBefore as bigint) - takerAmount);
    });

    it("should increment nonce after successful swap", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      assert.equal(await market.read.getNonce([maker.account.address]), 0n);
      await executeSwapAndWait(market, swapOrder, signature);
      assert.equal(await market.read.getNonce([maker.account.address]), 1n);
    });

    it("should emit SwapExecuted event", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await executeSwapAndWait(market, swapOrder, signature);

      const logs = await market.getEvents.SwapExecuted();
      const event = logs[logs.length - 1];

      assert.ok(logs.length > 0);
      assert.equal(event.args.maker?.toLowerCase(), maker.account.address.toLowerCase());
      assert.equal(event.args.taker?.toLowerCase(), taker.account.address.toLowerCase());
      assert.equal(event.args.makerToken?.toLowerCase(), tokenAAddress.toLowerCase());
      assert.equal(event.args.makerAmount, makerAmount);
      assert.equal(event.args.takerToken?.toLowerCase(), tokenBAddress.toLowerCase());
      assert.equal(event.args.takerAmount, takerAmount);
    });

    it("should revert with invalid signature", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder, other);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidSignature")
      );
    });

    it("should revert with invalid nonce", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount, 5n);
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidNonce")
      );
    });

    it("should prevent replay attacks", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount * 2n, takerAmount * 2n);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await executeSwapAndWait(market, swapOrder, signature);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidNonce")
      );
    });

    it("should allow multiple swaps with correct nonce progression", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount * 3n, takerAmount * 3n);

      for (let i = 0; i < 3; i++) {
        const swapOrder = createSwapOrder(makerAmount, takerAmount, BigInt(i));
        const signature = await signOrder(swapOrder);
        await executeSwapAndWait(market, swapOrder, signature);
        
        const nonce = await market.read.getNonce([maker.account.address]);
        assert.equal(nonce, BigInt(i + 1));
      }
    });

    it("should revert if maker has insufficient token balance", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("10000");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("ERC20InsufficientBalance") || 
                        error.message.includes("insufficient")
      );
    });

    it("should revert if taker has insufficient token balance", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("10000");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("ERC20InsufficientBalance") ||
                        error.message.includes("insufficient")
      );
    });

    it("should revert if maker has not approved tokens", async function () {
      const { market, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await tokenB.write.approve([secondaryMarketAddress, takerAmount], {
        account: taker.account,
      });

      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("ERC20InsufficientAllowance") ||
                        error.message.includes("allowance")
      );
    });

    it("should revert if taker has not approved tokens", async function () {
      const { market, tokenA } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await tokenA.write.approve([secondaryMarketAddress, makerAmount], {
        account: maker.account,
      });

      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("ERC20InsufficientAllowance") ||
                        error.message.includes("allowance")
      );
    });

    it("should revert with zero maker address", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = {
        maker: "0x0000000000000000000000000000000000000000" as Address,
        makerToken: tokenAAddress,
        makerAmount,
        takerToken: tokenBAddress,
        takerAmount,
        nonce: 0n,
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidMaker")
      );
    });

    it("should revert with zero makerToken address", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = {
        maker: maker.account.address,
        makerToken: "0x0000000000000000000000000000000000000000" as Address,
        makerAmount,
        takerToken: tokenBAddress,
        takerAmount,
        nonce: 0n,
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidMakerToken")
      );
    });

    it("should revert with zero takerToken address", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = {
        maker: maker.account.address,
        makerToken: tokenAAddress,
        makerAmount,
        takerToken: "0x0000000000000000000000000000000000000000" as Address,
        takerAmount,
        nonce: 0n,
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidTakerToken")
      );
    });

    it("should revert with zero makerAmount", async function () {
      const { market } = await getContracts();
      const takerAmount = parseEther("200");

      const swapOrder = {
        maker: maker.account.address,
        makerToken: tokenAAddress,
        makerAmount: 0n,
        takerToken: tokenBAddress,
        takerAmount,
        nonce: 0n,
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidMakerAmount")
      );
    });

    it("should revert with zero takerAmount", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");

      const swapOrder = {
        maker: maker.account.address,
        makerToken: tokenAAddress,
        makerAmount,
        takerToken: tokenBAddress,
        takerAmount: 0n,
        nonce: 0n,
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () => market.write.executeSwap([swapOrder, signature], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidTakerAmount")
      );
    });
  });

  describe("getNonce", function () {
    it("should return correct nonce for an address", async function () {
      const { market } = await getContracts();
      const nonce = await market.read.getNonce([maker.account.address]);
      assert.equal(nonce, 0n);
    });

    it("should return 0 for address that has never made a swap", async function () {
      const { market } = await getContracts();
      const nonce = await market.read.getNonce([other.account.address]);
      assert.equal(nonce, 0n);
    });
  });
});
