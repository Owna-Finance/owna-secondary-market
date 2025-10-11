# Owna Finance - Secondary Market Smart Contract

A smart contract for YRT (Yield-bearing Real-world asset Token) secondary market that enables peer-to-peer trading with a signature-based order system using EIP-712.

Owna Backend Secondary Market
•⁠  ⁠Endpoint: ⁠ https://owna-backend-secondary-market-production.up.railway.app ⁠

•⁠  ⁠Docs: ⁠ https://owna-backend-secondary-market-production.up.railway.app/api-docs ⁠

•⁠  ⁠Frontend Guide: ⁠ https://github.com/Owna-Finance/owna-backend-secondary-market?tab=readme-ov-file#%E2%80%8D-frontend-developer-guide ⁠

•⁠  ⁠Secondary Market: 0xBB3c9651A962ec831f3E30F007ff2254a70f72bf


## 📋 Description

Secondary Market is a smart contract that facilitates peer-to-peer token exchanges using a signature-based order mechanism. This contract is specifically designed to enable secure and efficient trading of YRT tokens in the secondary market.

### Key Features

- **Signature-based Orders**: Uses EIP-712 for order signing and validation
- **Peer-to-Peer Swaps**: Direct token exchange between maker and taker
- **Salt-based Orders**: Uses unique salt values for order identification and replay protection
- **Order Cancellation**: Makers can cancel their orders before execution
- **Order Status Tracking**: Tracks order states (None, Filled, Cancelled)
- **Gas Efficient**: Optimized to minimize gas costs
- **Reentrancy Protection**: Protected against reentrancy attacks
- **Token Agnostic**: Supports any ERC20 token exchange

## 🏗️ Smart Contract Architecture

### SecondaryMarket.sol

Main contract with the following components:

#### Data Structures

**SwapOrder Struct**

```solidity
struct SwapOrder {
    address maker;        // Order creator
    address makerToken;   // Token offered by maker
    uint256 makerAmount;  // Amount of maker token
    address takerToken;   // Token requested by maker
    uint256 takerAmount;  // Amount of taker token
    uint256 salt;         // Unique salt for order identification
}
```

**OrderStatus Enum**

```solidity
enum OrderStatus {
    NONE,       // 0: Order has not been processed
    FILLED,     // 1: Order has been successfully executed
    CANCELLED   // 2: Order has been cancelled by maker
}
```

#### Main Functions

- `executeSwap(SwapOrder calldata _order, bytes calldata _signature)`: Execute token exchange between maker and taker
- `cancelOrder(SwapOrder calldata _order)`: Cancel an order (only maker can cancel their own order)
- `getOrderStatus(bytes32 _orderHash)`: Get the current status of an order (returns 0, 1, or 2)

#### Events

- `SwapExecuted`: Emitted when swap is successfully executed
- `OrderCancelled`: Emitted when an order is cancelled by the maker

#### Custom Errors

- `SecondaryMarket__InvalidSignature`: Invalid signature
- `SecondaryMarket__InvalidMaker`: Maker address is zero address or not authorized
- `SecondaryMarket__InvalidMakerToken`: Maker token address is zero address
- `SecondaryMarket__InvalidTakerToken`: Taker token address is zero address
- `SecondaryMarket__InvalidMakerAmount`: Maker amount is zero
- `SecondaryMarket__InvalidTakerAmount`: Taker amount is zero
- `SecondaryMarket__OrderAlreadyFilled`: Order has already been executed
- `SecondaryMarket__OrderAlreadyCancelled`: Order has already been cancelled

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- pnpm (package manager)

### Installation

```shell
# Clone repository
git clone <repository-url>
cd owna-secondary-market

# Install dependencies
pnpm install
```

## 🧪 Testing

This project uses Node.js native test runner (`node:test`) with `viem` for testing.

### Running Tests

```shell
# Run all tests
npx hardhat test

# Run tests with coverage
npx hardhat coverage
```

## 📦 Deployment

### Deploy to Local Network

```shell
npx hardhat ignition deploy ignition/modules/SecondaryMarket.ts
```

### Deploy to Base Sepolia

```shell
# Set credentials
npx hardhat keystore set BASE_SEPOLIA_PRIVATE_KEY
npx hardhat keystore set BASE_SEPOLIA_RPC_URL

# Deploy
npx hardhat ignition deploy --network baseSepolia ignition/modules/SecondaryMarket.ts
```

### Deploy to Base Mainnet

```shell
# Set credentials
npx hardhat keystore set BASE_PRIVATE_KEY
npx hardhat keystore set BASE_RPC_URL

# Deploy with production profile
npx hardhat ignition deploy --network base ignition/modules/SecondaryMarket.ts
```

## 💡 Usage Guide

### 1. Create Order (Off-chain)

Maker creates an order and signs it using EIP-712:

```typescript
const domain = {
  name: "SecondaryMarket",
  version: "1",
  chainId: await publicClient.getChainId(),
  verifyingContract: secondaryMarketAddress,
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

const swapOrder = {
  maker: makerAddress,
  makerToken: yrtTokenAddress,
  makerAmount: parseEther("100"),
  takerToken: usdcAddress,
  takerAmount: parseUnits("200", 6),
  salt: uniqueSalt, // Generate unique salt for each order
};

const signature = await walletClient.signTypedData({
  domain,
  types,
  primaryType: "SwapOrder",
  message: swapOrder,
});
```

### 2. Approve Tokens

Both parties must approve their tokens:

```typescript
// Maker approve YRT token
await yrtToken.write.approve([secondaryMarketAddress, makerAmount]);

// Taker approve USDC token
await usdcToken.write.approve([secondaryMarketAddress, takerAmount]);
```

### 3. Execute Swap

Taker executes the swap with the order and signature:

```typescript
await secondaryMarket.write.executeSwap([swapOrder, signature], {
  account: takerAccount,
});
```

### 4. Cancel Order (Optional)

Maker can cancel an order before it is executed:

```typescript
// Only the maker can cancel their own order
await secondaryMarket.write.cancelOrder([swapOrder], {
  account: makerAccount,
});
```

### 5. Check Order Status

Check the status of an order using its hash:

```typescript
// Get order hash (you'll need to implement hash calculation)
const orderHash = await getOrderHash(swapOrder);

// Get order status
// Returns: 0 (NONE), 1 (FILLED), or 2 (CANCELLED)
const status = await secondaryMarket.read.getOrderStatus([orderHash]);
```

## 🔒 Security

### Security Features

1. **EIP-712 Signatures**: Secure and user-friendly signing standard
2. **Salt-based Order System**: Prevents replay attacks with unique order identifiers
3. **Order Status Tracking**: Prevents double-spending by tracking filled and cancelled orders
4. **Reentrancy Guard**: Protection from reentrancy attacks
5. **SafeERC20**: Safe token transfer handling
6. **Custom Errors**: Gas-efficient error handling
7. **Order Cancellation**: Makers can cancel orders to prevent unwanted executions

## 🛠️ Tech Stack

- **Solidity**: 0.8.29
- **Hardhat**: 3.0.6
- **Viem**: 2.37.9
- **OpenZeppelin Contracts**: 5.4.0
- **TypeScript**: 5.8.3
- **Node Test Runner**: Built-in
