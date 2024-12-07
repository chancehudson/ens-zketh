module.exports = (app) => {
  app.get("/", (req, res) => {
    const { did } = req.query;
    res.end(`
<html>
<head>
</head>
<body>

<input type="text" id="ensAddr" value="" placeholder="vitalik.eth" />
<input type="text" id="didAddr" value="" placeholder="did::" />
<button onclick="sign()">Associate DID</button>

<script>
if (!window.ethereum) {
  throw new Error('no ethereum detected in browser')
}
async function sign() {
  const ensField = document.getElementById('ensAddr');
  const didField = document.getElementById('didAddr');
  const did = didField.value.trim()
  const ens = ensField.value.trim()

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
          message: { identifier: did }
      })],
  });
  // redirect to make the assignment
  console.log(signature)
  const redirect_dest = \`http://localhost:3000/set_did?did=\${did}&signature=\${signature}&ens_name=\${ens}\`
  window.location.replace(redirect_dest)
}
</script>
</body>
</html>
`);
  });
};
