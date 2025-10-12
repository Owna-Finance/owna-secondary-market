export const secondaryMarketAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "ECDSAInvalidSignature",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "length",
        type: "uint256",
      },
    ],
    name: "ECDSAInvalidSignatureLength",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "ECDSAInvalidSignatureS",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidShortString",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    inputs: [],
    name: "SecondaryMarket__InvalidMaker",
    type: "error",
  },
  {
    inputs: [],
    name: "SecondaryMarket__InvalidMakerAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "SecondaryMarket__InvalidMakerToken",
    type: "error",
  },
  {
    inputs: [],
    name: "SecondaryMarket__InvalidSignature",
    type: "error",
  },
  {
    inputs: [],
    name: "SecondaryMarket__InvalidTakerAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "SecondaryMarket__InvalidTakerToken",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "orderHash",
        type: "bytes32",
      },
    ],
    name: "SecondaryMarket__OrderAlreadyCancelled",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "orderHash",
        type: "bytes32",
      },
    ],
    name: "SecondaryMarket__OrderAlreadyFilled",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "str",
        type: "string",
      },
    ],
    name: "StringTooLong",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [],
    name: "EIP712DomainChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "maker",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "makerToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "salt",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "makerAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "takerToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerAmount",
        type: "uint256",
      },
    ],
    name: "OrderCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "maker",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "salt",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "makerToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "makerAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "takerToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerAmount",
        type: "uint256",
      },
    ],
    name: "SwapExecuted",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "maker",
            type: "address",
          },
          {
            internalType: "address",
            name: "makerToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "makerAmount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "takerToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "takerAmount",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "salt",
            type: "string",
          },
        ],
        internalType: "struct SecondaryMarket.SwapOrder",
        name: "_order",
        type: "tuple",
      },
    ],
    name: "cancelOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      {
        internalType: "bytes1",
        name: "fields",
        type: "bytes1",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "version",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifyingContract",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "salt",
        type: "bytes32",
      },
      {
        internalType: "uint256[]",
        name: "extensions",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "maker",
            type: "address",
          },
          {
            internalType: "address",
            name: "makerToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "makerAmount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "takerToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "takerAmount",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "salt",
            type: "string",
          },
        ],
        internalType: "struct SecondaryMarket.SwapOrder",
        name: "_order",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "_signature",
        type: "bytes",
      },
    ],
    name: "executeSwap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_orderHash",
        type: "bytes32",
      },
    ],
    name: "getOrderStatus",
    outputs: [
      {
        internalType: "uint256",
        name: "status",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
