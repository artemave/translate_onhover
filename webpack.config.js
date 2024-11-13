const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { EnvironmentPlugin } = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const WebExtPlugin = require('web-ext-plugin')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'

let outputPath = path.resolve(__dirname, 'dist')

const config = {
  devtool: 'inline-source-map',
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
    path: outputPath
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
            plugins: ['@babel/plugin-transform-classes']
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
        'API_SECRET',
        'MEASUREMENT_ID',
        'MANIFEST_V3'
      ] : {
        'API_SECRET': '123456',
        'MEASUREMENT_ID': '343434',
        'MANIFEST_V3': 'false'
      }
    ),
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: process.env.MANIFEST_V3 === 'true' ? 'manifest_v3.json' : 'manifest_v2.json',
          to: 'manifest.json'
        },
        '*.png',
        'options.html',
      ]
    }),
    new WebExtPlugin.default({ sourceDir: outputPath })
  ]
}

if (mode === 'production') {
  config.optimization = {
    minimizer: [new UglifyJsPlugin({test: /\.js(\?.*)?$/i})]
  }
}

module.exports = config
