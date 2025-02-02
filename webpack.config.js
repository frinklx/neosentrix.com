const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    main: "./index.js",
    auth: "./auth/index.js",
    onboarding: "./onboarding/index.js",
    dashboard: "./dashboard/index.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
      chunks: ["main"],
    }),
    new HtmlWebpackPlugin({
      template: "./auth/login/index.html",
      filename: "auth/login/index.html",
      chunks: ["auth"],
    }),
    new HtmlWebpackPlugin({
      template: "./auth/signup/index.html",
      filename: "auth/signup/index.html",
      chunks: ["auth"],
    }),
    new HtmlWebpackPlugin({
      template: "./onboarding/index.html",
      filename: "onboarding/index.html",
      chunks: ["onboarding"],
    }),
    new HtmlWebpackPlugin({
      template: "./dashboard/index.html",
      filename: "dashboard/index.html",
      chunks: ["dashboard"],
    }),
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
    }),
  ],
  optimization: {
    moduleIds: "deterministic",
    runtimeChunk: "single",
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  },
  devServer: {
    static: "./dist",
    hot: true,
    historyApiFallback: true,
  },
};
