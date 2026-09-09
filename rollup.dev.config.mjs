import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" with { type: "json" };

const banner = chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version ?? "dev"}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName} β');\n/* 项目主页：${pkg.homepage} */\n/* Project homepage: ${pkg.homepage} */`;

export default [
	{
		input: "./src/request.dev.js",
		output: { file: "./dist/request.dev.bundle.js", format: "es", banner },
		plugins: [nodeResolve(), commonjs(), terser()],
	},
	{
		input: "./src/response.dev.js",
		output: { file: "./dist/response.dev.bundle.js", format: "es", banner },
		plugins: [nodeResolve(), commonjs(), terser()],
	},
];
