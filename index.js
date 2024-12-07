const { ethers } = require("ethers");

let app;
if (!process.env.WEBWORKER) {
  // require("dotenv").config();
  // const port = process.env.PORT || 3000;
  // const express = require("express");
  // app = express();
  // // Start the server
  // app.listen(port, () => {
  //   console.log(`Server running on port ${port}`);
  // });
} else {
  const { router, handleRequest } = require("express-flare");
  app = router();
  addEventListener("fetch", (event, env) => {
    event.respondWith(
      handleRequest({
        event,
        env,
        router: app,
        // cacheTime: 3600,
      }),
    );
  });
}

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
  throw new Error("RPC_URL env var is required");
}

const state = {
  // map address strings to did strings
  ADDR_DID_MAP: {},
  LOCAL: !process.env.WEBWORKER,
  RPC_URL,
  URL: process.env.URL || "http://localhost:3000",
  eth_rpc_req,
  chainId: eth_rpc_req("eth_chainId", []).then((v) => Number(v)),
  resolve_ens,
};

require("./src/index.js")(app, state);
require("./src/get_did.js")(app, state);
require("./src/set_did.js")(app, state);
require("./src/resolve_ens.js")(app, state);

async function eth_rpc_req(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.random().toString(),
      method,
      params,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }
  return data.result;
}

// ENS Registry Contract ABI (minimal for resolver lookup)
const ENS_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: "node",
        type: "bytes32",
      },
    ],
    name: "resolver",
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    type: "function",
  },
];

// ENS Resolver ABI (minimal for address lookup)
const RESOLVER_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: "node",
        type: "bytes32",
      },
    ],
    name: "addr",
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    type: "function",
  },
];

async function resolve_ens(ens_name) {
  try {
    // ENS Registry Contract namehash method
    const blockNum = await eth_rpc_req("eth_blockNumber", []);
    const safeBlock = parseInt(blockNum, 16) - 20; // ~5 mins worth of blocks
    const safeBlockHex = "0x" + safeBlock.toString(16);
    console.log("safe block", safeBlockHex);

    // ENS Registry Contract Address on Mainnet
    const ENS_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

    // 1. Get the namehash of the ENS domain
    const node = ethers.namehash(ens_name);

    // 2. Get the resolver address from the ENS Registry
    const resolver_addr = await eth_rpc_req("eth_call", [
      {
        to: ENS_ADDRESS,
        data: `0x0178b8bf${node.slice(2)}`, // resolver(bytes32)
      },
      safeBlockHex,
    ]).catch((e) => null);

    if (resolver_addr === null || BigInt(resolver_addr) === 0n) {
      return { ens_name, resolved_addr: null, resolver_addr: null };
    }

    // 3. Get the address from the resolver
    const address = await eth_rpc_req("eth_call", [
      {
        to: `0x${resolver_addr.slice(2 + 24)}`,
        data: `0x3b3b57de${node.slice(2)}`, // addr(bytes32)
      },
      safeBlockHex,
    ]).catch((e) => console.log(e) || null);

    if (address === null) {
      return { ens_name, resolved_addr: null, resolver_addr };
    }

    // Clean up the address
    const resolved_addr = `0x${address.slice(-40)}`;

    return {
      ens_name,
      resolved_addr,
      resolver_addr,
    };
  } catch (error) {
    console.error("Error resolving ENS name:", error);
    throw error;
  }
}
