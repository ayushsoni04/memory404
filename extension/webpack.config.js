const fs = require("fs");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

function withSaveOutcome(content, absoluteFrom) {
  if (!absoluteFrom.endsWith(`${path.sep}background.js`)) return content;
  const helper = fs
    .readFileSync(path.resolve(__dirname, "src/save-outcome.js"), "utf8")
    .replace(/^export /gm, "");
  return Buffer.from(`${helper}\n${content.toString()}`);
}

module.exports = {
  entry: {
    overlay: "./src/overlay.jsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
    // Single-file content script; avoid chunked loading.
    chunkLoading: false,
    wasmLoading: false,
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/i,
        type: "asset/source",
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./public/static",
          to: ".",
          transform(content, absoluteFrom) {
            return withSaveOutcome(content, absoluteFrom);
          },
        },
      ],
    }),
  ],
};
