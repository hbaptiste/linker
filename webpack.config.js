var path = require('path');
var webpack = require('webpack');
console.log(path.join(__dirname,'dist'));
module.exports = {
	entry: "./index.js",
	output: {
		path: path.join(__dirname, 'dist'),
		filename: "linker.min.js"
	},
	module: {
		loaders: [
			{test: /\.css$/, loader: "style!css"},
			{test: /\.html$/, loader: "html"}
		]
	},
	resolve: {
		extensions: ['','.js', '.json', '.html'],
		modulesDirectories: ['node_modules'],
	}
}