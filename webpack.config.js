'use strict';
const path = require('path');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  context: path.resolve(__dirname, './src'),
  entry: ['babel-polyfill', './js/index.js', './css/leaflet.css', './css/howl.css'],
  output: {
    path: path.resolve(__dirname, './public'),
    filename: "howl.js"
  },
  plugins: [
    new HtmlPlugin({template: 'index.html',inject : true}),
    new ExtractTextPlugin('howl.css'),
    new webpack.ProvidePlugin({$: 'jquery', jQuery: 'jquery'})
  ],
  devServer: {
    contentBase: './public',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({fallback: "style-loader", use: [{loader: "css-loader"}]}),
      },
      {
        test: /\.(png|gif|jpg|jpeg)$/,
        use: 'file-loader?name=./images/[name].[ext]'
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: 'url-loader?limit=10000&mimetype=application/font-woff&name=./fonts/[name].[ext]'
      },
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: 'file-loader?name=./fonts/[name].[ext]'
      },
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        use: ['babel-loader', 'eslint-loader']

      },
      {
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: /\.hbs$/,
        loader: "handlebars-loader",
        query: {inlineRequires: 'images/'}
      }
    ]
  }
};
