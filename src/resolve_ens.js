module.exports = (app, { eth_rpc_req, resolve_ens }) => {
  // Route handler for .well-known/atproto-did
  app.get("/resolve_ens", async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    const { ens_name } = req.query;
    try {
      // Return the extracted subdomain
      // load the ens address for the subdomain
      const ens_res = await resolve_ens(ens_name);
      const { resolved_addr } = ens_res;
      if (resolved_addr === null) {
        res.status(404).end(`no address found for ${ens_name}`);
        return;
      }
      res.json({ resolved_addr });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });
};
