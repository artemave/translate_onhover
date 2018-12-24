const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'

const config = {
  mode,
  entry: {
    background: './background.js',
    contentscript: './contentscript.js',
    options_script: './lib/options_script.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new CopyWebpackPlugin([
      'manifest.json',
      '*.png',
      'options.html',
      'lib/popup.js',
      'lib/popup.html',
      'lib/tat_popup.js',
      'lib/tat_popup.html',
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/xregexp/xregexp-all.js',
    ], {to: 'dist'})
  ]
}

module.exports = config
