const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { EnvironmentPlugin } = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'

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
    path: path.resolve(__dirname, 'dist')
  },
  experiments: {
    asset: true
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
      mode === 'production' ? ['TRACKING_ID'] : { 'TRACKING_ID': '123456' }
    ),
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        'manifest.json',
        '*.png',
        'options.html',
      ]
    })
  ]
}

if (mode === 'production') {
  config.optimization = {
    minimizer: [new UglifyJsPlugin({test: /\.js(\?.*)?$/i})]
  }
}

module.exports = config
