import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";

export default [
	{
		input: 'src/BiliBili.ADBlock.request.beta.js',
		output: {
			file: 'js/BiliBili.ADBlock.request.beta.js',
			format: 'es',
			banner: '/* README: https://github.com/BiliUniverse */',
		},
		plugins: [json(), commonjs()]
	},
	{
		input: 'src/BiliBili.ADBlock.response.beta.js',
		output: {
			file: 'js/BiliBili.ADBlock.response.beta.js',
			format: 'es',
			banner: '/* README: https://github.com/BiliUniverse */',
		},
		plugins: [json(), commonjs()]
	},
];
