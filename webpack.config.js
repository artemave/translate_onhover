const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')

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
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['@babel/plugin-transform-classes']
          }
        }
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new CopyWebpackPlugin([
      'manifest.json',
      '*.png',
      'options.html',
      'lib/popup.html',
      'lib/tat_popup.html',
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/xregexp/xregexp-all.js',
      'node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js'
    ], {to: 'dist'})
  ]
}

module.exports = config
