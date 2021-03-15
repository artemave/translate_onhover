const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { EnvironmentPlugin } = require('webpack')

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
      // {
      //   test: /\.js$/,
      //   exclude: /node_modules/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       plugins: ['@babel/plugin-transform-classes']
      //     }
      //   }
      // },
      {
        test: /\.html$/,
        type: 'asset/source'
      }
    ]
  },
  plugins: [
    new EnvironmentPlugin({
      USE_GA: 'true'
    }),
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        'manifest.json',
        '*.png',
        'options.html',
        'lib/popup.html',
        'lib/tat_popup.html',
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/xregexp/xregexp-all.js'
      ]
    })
  ]
}

module.exports = config
