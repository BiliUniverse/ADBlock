import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" with { type: "json" };

const banner = chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName}');\n/* 项目主页：${pkg.homepage} */\n/* Project homepage: ${pkg.homepage} */`;

export default [
	{
		input: "./src/request.js",
		output: { file: "./dist/request.bundle.js", format: "es", banner },
		plugins: [nodeResolve(), commonjs(), terser()],
	},
	{
		input: "./src/response.js",
		output: { file: "./dist/response.bundle.js", format: "es", banner },
		plugins: [nodeResolve(), commonjs(), terser()],
	},
];
