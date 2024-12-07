const express = require("express");
const port = process.env.PORT || 3000;
require("dotenv").config();

const app = express();

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
  throw new Error("RPC_URL env var is required");
}

const state = {
  // map address strings to did strings
  ADDR_DID_MAP: {},
  RPC_URL,
  eth_rpc_req,
  chainId: eth_rpc_req("eth_chainId", []).then((v) => Number(v)),
};

require("./src/index.js")(app, state);
require("./src/get_did.js")(app, state);
require("./src/set_did.js")(app, state);

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something broke!",
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

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
