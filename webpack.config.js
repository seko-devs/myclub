const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  
  mode: 'production',
 
  // The entry point file described above 
  entry: './app.js',
  // The location of the build folder described above
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: false, // Clean the output directory before emit
  },
  plugins: [
    new Dotenv({
      systemvars: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/, // match .js or .mjs
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      // New rule for CSS files
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  // Optional and for development only. This provides the ability to
  // map the built code back to the original source format when debugging.
  devtool: 'source-map',
};