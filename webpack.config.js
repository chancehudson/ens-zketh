const webpack = require("webpack");
const path = require("path");
require("dotenv").config();

module.exports = {
  target: "webworker",
  entry: "./index.js",
  output: {
    filename: "worker.js",
    path: path.join(__dirname, "dist"),
  },
  mode: "production",
  resolve: {
    fallback: {
      fs: false,
      path: false,
      stream: false,
      crypto: false,
      http: false,
      https: false,
      async_hooks: false,
      os: false,
      buffer: require.resolve("buffer/"),
      process: false,
      util: false,
      url: false,
      querystring: false,
      zlib: false,
      string_decoder: false,
      events: false,
      tls: false,
      net: false,
      assert: false,
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      process: `{ env: { RPC_URL: "${process.env.RPC_URL}", WEBWORKER: true, URL: "https://eth-bsky.app" } }`,
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    // You'll also need this for the buffer module
    new webpack.DefinePlugin({
      "global.Buffer": "Buffer",
    }),
  ],
};
