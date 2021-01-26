const path = require('path')

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  performance: {
    maxEntrypointSize: 1024000,
    maxAssetSize: 1024000
  },
  devServer: {
    publicPath: '/dist/',
    compress: false,
    port: 8080,
    hot: true,
    liveReload: true,
    contentBase: __dirname + "/public/",
  }
}
