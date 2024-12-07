const { recoverTypedSignature } = require("@metamask/eth-sig-util");

const domain = {
  name: "ens zketh",
  version: "1",
  chainId: 1,
};

const types = {
  DID: [{ name: "identifier", type: "string" }],
};

module.exports = (app, { ADDR_DID_MAP, RPC_URL, chainId }) => {
  app.get("/set_did", async (req, res) => {
    const { did, signature } = req.query;
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
    ADDR_DID_MAP[addr] = did;
    res.end(`recovered address ${addr} from signature for ${did}`);
  });
};
