const { recoverTypedSignature } = require("@metamask/eth-sig-util");

const domain = {
  name: "ens zketh",
  version: "1",
  chainId: 1,
};

const types = {
  DID: [{ name: "identifier", type: "string" }],
};

module.exports = (app, { LOCAL, ADDR_DID_MAP, RPC_URL, chainId }) => {
  app.get("/set_did", async (req, res) => {
    const { did, signature, ens_name } = req.query;
    const addr = recoverTypedSignature({
      data: {
        types,
        primaryType: "DID",
        domain,
        message: { identifier: did },
      },
      signature,
      version: "V4",
    });
    // update the address map
    if (LOCAL) {
      ADDR_DID_MAP[addr] = did;
    } else {
      await eth_bsky.put(addr, did);
      const value = await eth_bsky.get(addr);
      if (value === null) {
        res.status(404).end();
        return;
      }
    }
    res.status(200).end();
  });
};
