module.exports = (app) => {
  app.get("/", (req, res) => {
    const { did } = req.query;
    res.end(`
<html>
<head>
</head>
<body>
<script>
if (!window.ethereum) {
  throw new Error('no ethereum detected in browser')
}
;(async () => {
  const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
  });

  const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [accounts[0], JSON.stringify({
          types: {
            DID: [
              { name: 'identifier', type: 'string' }
            ]
          },
          primaryType: 'DID',
          domain: {
            name: 'ens zketh',
            version: '1',
            chainId: Number(await window.ethereum.request({ method: 'eth_chainId' })),
          },
          message: { identifier: '${did}' }
      })],
  });
  console.log(signature)
  console.log(\`http://localhost:3000/set_did?did=${did}&signature=\${signature}\`)
})()
</script>
</body>
<input type="text" />
</html>
`);
  });
};
