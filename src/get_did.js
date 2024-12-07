const web3 = require("web3");

// Parse subdomain from hostname
const extractSubdomain = (hostname) => {
  // Remove 'ens.zketh.io' from the end and any remaining dots
  return hostname.replace(/\.ens\.zketh\.io$/, "").replace(/\.$/, "");
};

module.exports = (app, { ADDR_DID_MAP, eth_rpc_req }) => {
  // Route handler for .well-known/atproto-did
  app.get("/.well-known/atproto-did", async (req, res) => {
    try {
      const hostname = req.hostname;
      const subdomain = extractSubdomain(hostname);

      if (!subdomain) {
        // instead return the html
        return res.end(
          "rendering message\nhopefully that newline works\n\n\n\n\n.......__-___....___---__-----........______________________-__---____--_-__.......___--------------------------____....",
        );
      }

      // Return the extracted subdomain
      // load the ens address for the subdomain
      const ens_name = process.env.TEST_ENS_NAME || subdomain;
      const ens_res = await resolve_ens(ens_name, eth_rpc_req);
      const { resolved_addr } = ens_res;
      if (resolved_addr === null) {
        res.status(404).end(`no address found for ${ens_name}`);
        return;
      }
      console.log(`resolved: ${JSON.stringify(ens_res)}`);

      // check a database mapping ens address to :did

      const did = ADDR_DID_MAP[resolved_addr];
      if (!did) {
        res.status(404).end(`no DID associated with address ${resolved_addr}`);
        return;
      }

      res.end(did);
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });
};

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

async function resolve_ens(ens_name, eth_rpc_req) {
  try {
    // ENS Registry Contract namehash method
    const namehash = (name) => {
      let node =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      console.log(node.slice(2), node.slice(2).length);
      if (name) {
        let labels = name.split(".");
        console.log(name);
        for (let i = labels.length - 1; i >= 0; i--) {
          console.log(web3.utils.keccak256(labels[i]).slice(2));
          node = web3.utils.keccak256(
            Buffer.concat([
              Buffer.from(node.slice(2), "hex"),
              Buffer.from(web3.utils.keccak256(labels[i]).slice(2), "hex"),
            ]),
          );
        }
      }
      return node;
    };

    const blockNum = await eth_rpc_req("eth_blockNumber", []);
    const safeBlock = parseInt(blockNum, 16) - 20; // ~5 mins worth of blocks
    const safeBlockHex = "0x" + safeBlock.toString(16);
    console.log("safe block", safeBlockHex);

    // ENS Registry Contract Address on Mainnet
    const ENS_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

    // 1. Get the namehash of the ENS domain
    const node = namehash(ens_name);

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
