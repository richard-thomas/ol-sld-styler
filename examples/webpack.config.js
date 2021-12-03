const webpack = require('webpack'); // Access built-in webpack plugins

module.exports = [
{
  name: 'basic',
  mode: 'development',
  //mode: 'production',
  entry: './src/basic_example.js',
  output: {
    filename: 'basic_example_bundle.js'
  },
  devtool: 'source-map',
  devServer: {
    static: './dist'
  },
  resolve: {
    fallback: {
      fs: false,
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ],
  },
  experiments: {
    // Used by loadGpkg.js to load sql.js
    asyncWebAssembly: true
  }
},
{
  name: 'sldfiles',
  mode: 'development',
  //mode: 'production',
  entry: './src/sld_files_example.js',
  output: {
    filename: 'sld_files_example_bundle.js'
  },
  devtool: 'source-map',
  devServer: {
    static: './dist'
  },
  resolve: {
    fallback: {
      fs: false,
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ],
  },
  experiments: {
    // Used by loadGpkg.js to load sql.js
    asyncWebAssembly: true
  }
},
{
  name: 'layersw',
  mode: 'development',
  //mode: 'production',
  entry: './src/layersw_example.js',
  output: {
    filename: 'layersw_example_bundle.js'
  },
  devtool: 'source-map',
  devServer: {
    static: './dist'
  },
  resolve: {
    fallback: {
      fs: false,
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ],
  },
  experiments: {
    // Used by loadGpkg.js to load sql.js
    asyncWebAssembly: true
  }
},
{
  name: 'legend',
  mode: 'development',
  //mode: 'production',
  entry: './src/legend_example.js',
  output: {
    filename: 'legend_example_bundle.js'
  },
  devtool: 'source-map',
  devServer: {
    static: './dist'
  },
  resolve: {
    fallback: {
      fs: false,
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ],
  },
  experiments: {
    // Used by loadGpkg.js to load sql.js
    asyncWebAssembly: true
  }
},
{
  name: 'full',
  mode: 'development',
  //mode: 'production',
  entry: './src/full_example.js',
  output: {
    filename: 'full_example_bundle.js'
  },
  devtool: 'source-map',
  devServer: {
    static: './dist'
  },
  resolve: {
    fallback: {
      fs: false,
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ],
  },
  experiments: {
    // Used by loadGpkg.js to load sql.js
    asyncWebAssembly: true
  }
}
];
