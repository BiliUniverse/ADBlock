import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';

export default [
	{
		input: 'src/BiliBili.ADBlock.request.js',
		output: {
			file: 'js/BiliBili.ADBlock.request.js',
			format: 'es',
			banner: '/* README: https://github.com/BiliUniverse */',
		},
		plugins: [json(), commonjs(), terser()]
	},
	{
		input: 'src/BiliBili.ADBlock.response.js',
		output: {
			file: 'js/BiliBili.ADBlock.response.js',
			format: 'es',
			banner: '/* README: https://github.com/BiliUniverse */',
		},
		plugins: [json(), commonjs(), terser()]
	},
];
