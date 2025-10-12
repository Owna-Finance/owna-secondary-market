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
      { name: "salt", type: "string" },
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
    salt: string = "0"
  ) => ({
    maker: maker.account.address,
    makerToken: tokenAAddress,
    makerAmount,
    takerToken: tokenBAddress,
    takerAmount,
    salt,
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

    it("should return 0 (NONE) for non-existent orders", async function () {
      const { market } = await getContracts();
      const dummyHash =
        "0x0000000000000000000000000000000000000000000000000000000000000001";
      const status = await market.read.getOrderStatus([dummyHash]);
      assert.equal(status, 0n);
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

    it("should mark order as filled after successful swap", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await executeSwapAndWait(market, swapOrder, signature);

      // Try to execute same order again - should revert with OrderAlreadyFilled
      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__OrderAlreadyFilled")
      );
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
      assert.equal(
        event.args.maker?.toLowerCase(),
        maker.account.address.toLowerCase()
      );
      assert.equal(
        event.args.taker?.toLowerCase(),
        taker.account.address.toLowerCase()
      );
      assert.equal(event.args.salt, "0");
      assert.equal(
        event.args.makerToken?.toLowerCase(),
        tokenAAddress.toLowerCase()
      );
      assert.equal(event.args.makerAmount, makerAmount);
      assert.equal(
        event.args.takerToken?.toLowerCase(),
        tokenBAddress.toLowerCase()
      );
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
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__InvalidSignature")
      );
    });

    it("should allow same amounts with different salt", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount * 2n, takerAmount * 2n);

      // First order with salt 0
      const swapOrder1 = createSwapOrder(makerAmount, takerAmount, "0");
      const signature1 = await signOrder(swapOrder1);
      await executeSwapAndWait(market, swapOrder1, signature1);

      // Second order with salt 1 - should succeed
      const swapOrder2 = createSwapOrder(makerAmount, takerAmount, "1");
      const signature2 = await signOrder(swapOrder2);
      await executeSwapAndWait(market, swapOrder2, signature2);

      // Both orders should be successful
      assert.ok(true);
    });

    it("should prevent replay attacks with same salt", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount * 2n, takerAmount * 2n);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await executeSwapAndWait(market, swapOrder, signature);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__OrderAlreadyFilled")
      );
    });

    it("should allow multiple swaps with different salts", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount * 3n, takerAmount * 3n);

      for (let i = 0; i < 3; i++) {
        const swapOrder = createSwapOrder(
          makerAmount,
          takerAmount,
          i.toString()
        );
        const signature = await signOrder(swapOrder);
        await executeSwapAndWait(market, swapOrder, signature);
      }

      // All swaps should complete successfully
      assert.ok(true);
    });

    it("should revert if maker has insufficient token balance", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("10000");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("ERC20InsufficientBalance") ||
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
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("ERC20InsufficientBalance") ||
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
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("ERC20InsufficientAllowance") ||
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
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("ERC20InsufficientAllowance") ||
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
        salt: "0",
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
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
        salt: "0",
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__InvalidMakerToken")
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
        salt: "0",
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__InvalidTakerToken")
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
        salt: "0",
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__InvalidMakerAmount")
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
        salt: "0",
      };
      const signature = await signOrder(swapOrder);

      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__InvalidTakerAmount")
      );
    });
  });

  describe("cancelOrder", function () {
    it("should allow maker to cancel their order", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = createSwapOrder(makerAmount, takerAmount);

      const hash = await market.write.cancelOrder([swapOrder], {
        account: maker.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Verify order is cancelled by trying to execute it
      const signature = await signOrder(swapOrder);
      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__OrderAlreadyCancelled")
      );
    });

    it("should emit OrderCancelled event", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = createSwapOrder(makerAmount, takerAmount);

      await market.write.cancelOrder([swapOrder], {
        account: maker.account,
      });

      const logs = await market.getEvents.OrderCancelled();
      const event = logs[logs.length - 1];

      assert.ok(logs.length > 0);
      assert.equal(
        event.args.maker?.toLowerCase(),
        maker.account.address.toLowerCase()
      );
      assert.equal(
        event.args.makerToken?.toLowerCase(),
        tokenAAddress.toLowerCase()
      );
      assert.equal(event.args.salt, "0");
      assert.equal(event.args.makerAmount, makerAmount);
      assert.equal(
        event.args.takerToken?.toLowerCase(),
        tokenBAddress.toLowerCase()
      );
      assert.equal(event.args.takerAmount, takerAmount);
    });

    it("should revert if non-maker tries to cancel order", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = createSwapOrder(makerAmount, takerAmount);

      await assert.rejects(
        () => market.write.cancelOrder([swapOrder], { account: taker.account }),
        (error: any) => error.message.includes("SecondaryMarket__InvalidMaker")
      );
    });

    it("should revert if order is already filled", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      // Execute the swap first
      await executeSwapAndWait(market, swapOrder, signature);

      // Try to cancel - should revert
      await assert.rejects(
        () => market.write.cancelOrder([swapOrder], { account: maker.account }),
        (error: any) =>
          error.message.includes("SecondaryMarket__OrderAlreadyFilled")
      );
    });

    it("should revert if order is already cancelled", async function () {
      const { market } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      const swapOrder = createSwapOrder(makerAmount, takerAmount);

      // Cancel the order first
      const hash = await market.write.cancelOrder([swapOrder], {
        account: maker.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Try to cancel again - should revert
      await assert.rejects(
        () => market.write.cancelOrder([swapOrder], { account: maker.account }),
        (error: any) =>
          error.message.includes("SecondaryMarket__OrderAlreadyCancelled")
      );
    });

    it("should prevent execution of cancelled order", async function () {
      const { market, tokenA, tokenB } = await getContracts();
      const makerAmount = parseEther("100");
      const takerAmount = parseEther("200");

      await approveTokens(tokenA, tokenB, makerAmount, takerAmount);
      const swapOrder = createSwapOrder(makerAmount, takerAmount);
      const signature = await signOrder(swapOrder);

      // Cancel the order
      const hash = await market.write.cancelOrder([swapOrder], {
        account: maker.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Try to execute - should revert
      await assert.rejects(
        () =>
          market.write.executeSwap([swapOrder, signature], {
            account: taker.account,
          }),
        (error: any) =>
          error.message.includes("SecondaryMarket__OrderAlreadyCancelled")
      );
    });
  });
});
