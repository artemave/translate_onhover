const path = require('path')

const root = path.resolve(__dirname, '../../..')

const instrumentedFiles = require('./instrumentedFiles.cjs')

const instrument = {
  test: instrumentedFiles.map(file => path.join(root, file)),
  use: {
    loader: 'babel-loader',
    options: {
      plugins: ['babel-plugin-istanbul'],
    },
  },
}

module.exports = {
  mode: 'development',
  devtool: false,
  context: root,
  entry: {
    contentHarness: './test/browser/support/contentHarness.js',
    optionsHarness: './test/browser/support/optionsHarness.js',
    popup: './lib/popup.js',
    tat_popup: './lib/tat_popup.js',
  },
  output: {
    path: path.join(root, '.browser-harness'),
  },
  module: {
    rules: [
      ...process.env.COVERAGE === 'true' ? [instrument] : [],
      {
        test: /\.html$/,
        type: 'asset/source',
      },
    ],
  },
}
