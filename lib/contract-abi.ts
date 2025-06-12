// Arena Launch Contract ABI (partial, focusing on token creation)
export const ARENA_CONTRACT_ABI = [
  // Events
{
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "curveScaler",
            "type": "uint128"
          },
          {
            "internalType": "uint16",
            "name": "a",
            "type": "uint16"
          },
          {
            "internalType": "uint8",
            "name": "b",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "lpDeployed",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "lpPercentage",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "salePercentage",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "creatorFeeBasisPoints",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "creatorAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pairAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenContractAddress",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct TokenManager.TokenParameters",
        "name": "params",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenSupply",
        "type": "uint256"
      }
    ],
    "name": "TokenCreated",
    "type": "event"
  },

  // Functions
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "totalSupply",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "taxPercentage",
        type: "uint256",
      },
    ],
    name: "createToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Nieuwe createToken functie met andere parameters
  {
    inputs: [
      {
        internalType: "uint16",
        name: "param1",
        type: "uint16",
      },
      {
        internalType: "uint8",
        name: "param2",
        type: "uint8",
      },
      {
        internalType: "uint128",
        name: "param3",
        type: "uint128",
      },
      {
        internalType: "uint8",
        name: "param4",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "param6",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "totalSupply",
        type: "uint256",
      },
    ],
    name: "createToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenAmount",
        type: "uint256",
      },
    ],
    name: "createLP",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "buy",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
]
