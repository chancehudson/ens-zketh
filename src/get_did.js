module.exports = (app, { LOCAL, ADDR_DID_MAP, resolve_ens }) => {
  // Route handler for .well-known/atproto-did
  app.get("/.well-known/atproto-did", async (req, res) => {
    try {
      const url = new URL(req.url);
      if (
        url.hostname.split(".").length !== 3 ||
        url.hostname.indexOf("eth-bsky.app") === -1
      ) {
        res.status(404).end("must specify subdomain");
        return;
      }
      const ens_name = url.hostname.split(".")[0] + ".eth";
      // Return the extracted subdomain
      // load the ens address for the subdomain
      const ens_res = await resolve_ens(ens_name);
      const { resolved_addr } = ens_res;
      if (resolved_addr === null) {
        res.status(404).end(`no address found for ${ens_name}`);
        return;
      }
      // check a database mapping ens address to :did
      let did;
      if (LOCAL) {
        did = ADDR_DID_MAP[resolved_addr];
      } else {
        did = await eth_bsky.get(resolved_addr);
      }
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
