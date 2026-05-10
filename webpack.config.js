const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const fs = require('fs'); //Node's built-in File System module

// --- AUTOMATION SCRIPT ---
// 1. Read all files in the current root directory
// 2. Filter out only the files that end in .html
// 3. Create a new HtmlWebpackPlugin for each one
const htmlPlugins = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.html'))
  .map(file => {
    return new HtmlWebpackPlugin({
      template: `./${file}`,
      filename: file
    });
  });
// -------------------------

module.exports = {
  
  mode: 'production',
 
  // The entry point file described above 
  entry: './app.js',
  // The location of the build folder described above
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true, // Clean the output directory before emit
  },
  plugins: [
    new Dotenv({
      systemvars: true
    }),
    // The "spread" operator (...) takes the array we generated 
    // above and dumps all the plugins right here automatically!
    ...htmlPlugins
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