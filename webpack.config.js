const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { EnvironmentPlugin } = require('webpack')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
const coverage = process.env.COVERAGE === 'true'

const config = {
  devtool: mode === 'production' ? false : 'inline-source-map',
  mode,
  entry: {
    background: './background.js',
    contentscript: './contentscript.js',
    options_script: './lib/options_script.js',
    tat_popup: './lib/tat_popup.js',
    popup: './lib/popup.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      // Without this custom elements don't work on youtube... wtf
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            // babel-plugin-istanbul only for the e2e-coverage build (see
            // scripts/test-e2e-coverage.sh) - it bakes real branch/function
            // counters into the source, which is what actually makes e2e
            // coverage numbers trustworthy (V8's own coverage collection
            // doesn't reliably give block-level detail for a script this
            // size - see test/e2e/support/reportCoverage.mjs).
            plugins: [
              '@babel/plugin-transform-classes',
              ...(coverage ? [
                // Default global-object lookup uses `new Function('return
                // this')`, which is `eval`-like and gets killed outright by
                // Manifest V3's CSP (no 'unsafe-eval') in every context
                // that matters here - content script, extension pages, and
                // the service worker alike. Referencing `globalThis`
                // directly instead needs no eval, so it's CSP-safe.
                ['babel-plugin-istanbul', { coverageGlobalScope: 'globalThis', coverageGlobalScopeFunc: false }]
              ] : [])
            ]
          }
        }
      },
      {
        test: /\.html$/,
        type: 'asset/source'
      }
    ]
  },
  plugins: [
    new EnvironmentPlugin(
      mode === 'production' ? [
        'GA_API_SECRET',
        'GA_MEASUREMENT_ID',
        'MANIFEST_V3'
      ] : {
        'GA_API_SECRET': '123456',
        'GA_MEASUREMENT_ID': '343434',
        'MANIFEST_V3': 'false'
      }
    ),
    new EnvironmentPlugin({ DEV_OPTIONS: '{}' }),
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: process.env.MANIFEST_V3 === 'true' ? 'manifest_v3.json' : 'manifest_v2.json',
          to: 'manifest.json',
          transform: content => process.env.GECKO_ID
            ? JSON.stringify({ ...JSON.parse(content), browser_specific_settings: { gecko: { id: process.env.GECKO_ID } } }, null, 2)
            : content
        },
        '*.png',
        'options.html',
      ]
    })
  ]
}

module.exports = config
