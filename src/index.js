const domains = [
  "eth-bsky.app",
  "eth.band",
  "eth.br.com",
  "eth.cn.com",
  "eth.co.bz",
  "eth.com.im",
  "eth.furniture",
  "eth.gr.com",
  "eth.hu.net",
  "eth.net.im",
  "eth.net.pe",
  "eth.net.ph",
  "eth.net.vc",
  "eth.org.im",
  "eth.org.mx",
  "eth.org.pe",
  "eth.org.ph",
  "eth.org.vc",
];

module.exports = (app, { LOCAL, ADDR_DID_MAP, URL: _URL, resolve_ens }) => {
  app.get("/", async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("content-type", "text/html");
    const url = new URL(
      LOCAL
        ? req.protocol + "://" + req.get("host") + req.originalUrl
        : req.url,
    );

    let ens_name;
    for (const d of domains) {
      if (url.hostname.indexOf(d) === -1) continue;
      const remaining = url.hostname.replace(d, "");
      if (/^[a-zA-Z0-9]+\.$/.test(remaining)) {
        ens_name = remaining + "eth";
        break;
      }
    }
    if (ens_name) {
      const { resolved_addr } = await resolve_ens(ens_name);
      if (!resolved_addr) {
        res.end(`
  <html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  </head>
  <body>
  <p>This is the bluesky DID page for <span style="font-weight: bold">${ens_name}</span>.</p>
  <p>This ENS name is not associated with an Ethereum address!</p>
  </body>
  </html>
          `);
        return;
      }
      let existing;
      if (LOCAL) {
        existing = ADDR_DID_MAP[resolved_addr];
      } else {
        existing = await eth_bsky.get(resolved_addr);
      }
      if (existing) {
        res.end(`
  <html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  </head>
  <body>
  <p>This is the bluesky DID page for <span style="font-weight: bold">${ens_name}</span>.</p>
  <p>This ENS address is associated with <span style="font-weight: bold">${existing}</span></p>
  <div style="display: flex; flex-direction: row; align-items: center">
    <span style="margin-right: 4px">Valid handles: </span>
    <select id="domains" name="domains" style="margin-right: 4px">
      ${domains.map((d) => `<option value="${ens_name}${d.slice(3)}">${ens_name}${d.slice(3)}</option>`).join("")}
    </select>
    <button onclick="navigator.clipboard.writeText(document.getElementById('domains').value)">Copy</button>
  </div>
  <p>
    To use this in bluesky go to Settings -> Account -> Handle -> I have my own domain -> No DNS Panel -> Verify Text File and enter any of the above handles.
  </p>
  </body>
  </html>
          `);
        return;
      }
      res.end(`
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body>
<p>This is the bluesky DID page for <span style="font-weight: bold">${ens_name}</span>.</p>
<p>This ens name is not currently associated with a bluesky DID.</p>
</body>
</html>
        `);
      return;
    }
    const { did } = req.query;
    res.end(`
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body>
<div>
<pre>
                           .oMc
                        .MMMMMP
                      .MM888MM
....                .MM88888MP
MMMMMMMMb.         d8MM8tt8MM
 MM88888MMMMc \`:' dMME8ttt8MM
  MM88tt888EMMc:dMM8E88tt88MP
   MM8ttt888EEM8MMEEE8E888MC
   \`MM888t8EEEM8MMEEE8t8888Mb
    "MM88888tEM8"MME88ttt88MM
     dM88ttt8EM8"MMM888ttt8MM
     MM8ttt88MM" " "MMNICKMM"
     3M88888MM"      "MMMP"
      "MNICKM"                [<a href="https://github.com/chancehudson/ens-zketh" target="_blank">source</a>]
</pre>

</div>
<div id="start_content">
  <p>Welcome to the Ethereum bluesky DID manager. This service allows you to authenticate with bluesky using an ENS address.</p>
  <p>This service will resolve your ENS domain to an address (if it exists). Then it will ask for a signature from you (no transaction) to prove ownership of the domain.</p>

  <p>Let's get started!</p>

  <button onclick="start_signin()" id="signin_button">I have a bluesky account</button>
  <button onclick="start_signup()" id="signup_button">I DON'T have a bluesky account</button>

</div>
<div id="signin_content" style="display: none;">
  <p>Enter your ENS address and bluesky handle to associate them.</p>
  <p>We'll ask for a single signature</p>
  <input type="text" id="ensAddr" value="" placeholder="vitalik.eth" />
  <input type="text" id="bskyAddr" value="" placeholder="@user.bsky.social" />
  <button onclick="associate_ens_bsky().catch(e => {
    log('🛑 failed to make association!')
    log('🛑 ' + e.toString())
    console.log(e)
  })">Associate</button>
</div>
<div id="signup_content" style="display: none;">
  <p>Go make a bluesky account <a href="https://bsky.app" target="_blank">here</a>.</p>
  <p>Use any handle you want, it will be replaced when you associate your ens address.</p>
  <button onclick="start_signin()" id="signin_button">I have a bluesky account</button>
</div>

<div id="messages">
</div>

<script>
const status_messages = []

if (!window.ethereum) {
  throw new Error('no ethereum detected in browser')
}
async function start_signin() {
  const start_content = document.getElementById('start_content')
  const signin_content = document.getElementById('signin_content')
  const signup_content = document.getElementById('signup_content')
  signin_content.style.display = 'block'
  signup_content.style.display = 'none'
  start_content.style.display = 'none'
}

async function start_signup() {
  const signin_content = document.getElementById('signin_content')
  const signup_content = document.getElementById('signup_content')
  signin_content.style.display = 'none'
  signup_content.style.display = 'block'
  start_content.style.display = 'none'
}

async function associate_ens_bsky() {
  const ensField = document.getElementById('ensAddr');
  const bskyField = document.getElementById('bskyAddr');

  /// First load the ens address
  log('🧐 resolving ens name: ' + ensField.value.trim())
  const ens_addr = await resolve_ens(ensField.value.trim())
  log('✅ resolved to: ' + ens_addr)

  /// Then resolve the bsky handle to a DID
  log('🧐 resolving bsky handle: ' + bskyField.value.trim())
  const did = await resolve_bsky(bskyField.value.trim())
  log('✅ resolved to: ' + did)

  const signature = await retrieve_sig(did, ens_addr)

  log('✅ signature succeeded')
  log('🔀 making DID association')

  // make the assignment
  const u = \`${_URL}/set_did?did=\${did}&signature=\${signature}&ens_name=\${ensField.value.trim()}\`
  const r = await fetch(u)
  if (!r.ok) {
    log('🛑 failed to make association!')
    return
  }
  log('✅ association complete')

  log('redirecting, bye! 😉')
  await new Promise(r => setTimeout(r, 1500))
  const name = ensField.value.trim().split('.')[0]
  window.location.replace(\`https://\${name}.eth-bsky.app\`)
}

async function retrieve_sig(did, ens_addr) {
  log('🔏 attempting signature')
  /// Now attempt to make a signature for the ens address
  const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
  });

  if (accounts.indexOf(ens_addr) === -1) {
    throw new Error('account not found in metamask')
  }

  return window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [ens_addr, JSON.stringify({
        types: {
          DID: [
            { name: 'identifier', type: 'string' }
          ]
        },
        primaryType: 'DID',
        domain: {
          name: 'ens zketh',
          version: '1',
          chainId: 1,
        },
        message: { identifier: did }
    })],
  });
}

/// returns a string address
async function resolve_ens(ens_name) {
  if (!/^[a-zA-Z0-9\-]+\.eth$/.test(ens_name)) {
    throw new Error('invalid ens name, must be a top level ens domain like "vitalik.eth"')
  }
  const url = new URL('/resolve_ens', "${_URL}");
  url.searchParams.set('ens_name', ens_name);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data.resolved_addr
}

/// returns a string did
async function resolve_bsky(handle) {
  if (!/^@?([a-zA-Z0-9\-]+\.)+$/.test(handle)) {
    throw new Error('invalid handle format')
  }
  const url = new URL('/.well-known/atproto-did', 'https://' + handle.replace('@', ''));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.text();
}

function log(msg) {
  status_messages.push(msg)
  const log_div = document.getElementById('messages')
  log_div.innerHTML = status_messages.join('<br />')
}
</script>
</body>
</html>
`);
  });
};
