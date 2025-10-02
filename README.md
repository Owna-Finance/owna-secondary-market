# Owna Finance - Secondary Market Smart Contract

A smart contract for YRT (Yield-bearing Real-world asset Token) secondary market that enables peer-to-peer trading with a signature-based order system using EIP-712.

## 📋 Description

Secondary Market is a smart contract that facilitates peer-to-peer token exchanges using a signature-based order mechanism. This contract is specifically designed to enable secure and efficient trading of YRT tokens in the secondary market.

### Key Features

- **Signature-based Orders**: Uses EIP-712 for order signing and validation
- **Peer-to-Peer Swaps**: Direct token exchange between maker and taker
- **Nonce Management**: Prevents replay attacks with per-user nonce system
- **Gas Efficient**: Optimized to minimize gas costs
- **Reentrancy Protection**: Protected against reentrancy attacks
- **Token Agnostic**: Supports any ERC20 token exchange

## 🏗️ Smart Contract Architecture

### SecondaryMarket.sol

Main contract with the following components:

#### Data Structure

```solidity
struct SwapOrder {
    address maker;        // Order creator
    address makerToken;   // Token offered by maker
    uint256 makerAmount;  // Amount of maker token
    address takerToken;   // Token requested by maker
    uint256 takerAmount;  // Amount of taker token
    uint256 nonce;        // Nonce to prevent replay
}
```

#### Main Functions

- `executeSwap(SwapOrder calldata _order, bytes calldata _signature)`: Execute token exchange
- `getNonce(address _maker)`: Get current nonce for an address

#### Events

- `SwapExecuted`: Emitted when swap is successfully executed

#### Custom Errors

- `SecondaryMarket__InvalidNonce`: Invalid nonce
- `SecondaryMarket__InvalidSignature`: Invalid signature
- `SecondaryMarket__InvalidMaker`: Maker address is zero address
- `SecondaryMarket__InvalidMakerToken`: Maker token address is zero address
- `SecondaryMarket__InvalidTakerToken`: Taker token address is zero address
- `SecondaryMarket__InvalidMakerAmount`: Maker amount is zero
- `SecondaryMarket__InvalidTakerAmount`: Taker amount is zero

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

### Test Coverage

Tests include:

- ✅ Deployment and initialization
- ✅ Swap execution with valid signature
- ✅ Signature and nonce validation
- ✅ Protection against replay attacks
- ✅ Error handling (insufficient balance, insufficient allowance)
- ✅ Zero value validation (addresses and amounts)
- ✅ Multiple swaps with nonce progression
- ✅ Event emission

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
    { name: "nonce", type: "uint256" },
  ],
};

const swapOrder = {
  maker: makerAddress,
  makerToken: yrtTokenAddress,
  makerAmount: parseEther("100"),
  takerToken: usdcAddress,
  takerAmount: parseUnits("200", 6),
  nonce: currentNonce,
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

## 🔒 Security

### Security Features

1. **EIP-712 Signatures**: Secure and user-friendly signing standard
2. **Nonce System**: Prevents replay attacks
3. **Reentrancy Guard**: Protection from reentrancy attacks
4. **SafeERC20**: Safe token transfer handling
5. **Custom Errors**: Gas-efficient error handling

### Audit Considerations

- Contract uses audited OpenZeppelin libraries
- Implementation follows DeFi best practices
- Comprehensive test coverage (>95%)

## 🛠️ Tech Stack

- **Solidity**: 0.8.29
- **Hardhat**: 3.0.6
- **Viem**: 2.37.9
- **OpenZeppelin Contracts**: 5.4.0
- **TypeScript**: 5.8.3
- **Node Test Runner**: Built-in

## 📊 Gas Optimization

The contract is optimized for gas efficiency:

- Uses custom errors (cheaper than require strings)
- Efficient storage usage with mappings
- SafeERC20 for token transfers
- Optimized with 200 runs

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📞 Support

For questions or support, please contact the Owna Finance team.
