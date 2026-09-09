import getStorage from "@nsnanocat/util/getStorage.mjs";
import { Console, Lodash as _ } from "@nsnanocat/util";
// 原先用于按 Storage 选择配置来源；固定优先级后暂不使用，保留说明供以后评估兼容性。
// import { Storage } from "@nsnanocat/util";

/**
 * 设置环境变量。
 * Set environment variables.
 * @author VirgilClyne
 * @param {string} name 持久化存储键。
 * Persistent store key.
 * @param {string|string[]} platforms 平台名称。
 * Platform names.
 * @param {object} database 默认数据库。
 * Default database.
 * @param {object} KV 可选的异步 KV 存储。
 * Optional asynchronous KV storage.
 * @returns {Promise<object>} 设置、缓存与配置。
 * Settings, caches, and configurations.
 */
export default async function setENV(name, platforms, database, KV) {
	Console.log("☑️ Set Environment Variables");
	const argumentStorage = globalThis.$argument.Storage;
	let environment;
	/*
	 * 重要：ADBlock 的配置优先级固定为 BoxJS > 模块参数 > 项目默认值。
	 * getStorage 在 Storage 为 undefined 时会按 database -> $argument -> PersistentStore 合并，
	 * 因此这里必须临时忽略两端保存的 Storage 选择。不要改回按 Storage 切换配置来源，
	 * 否则会再次造成日志等级等设置在同一次脚本执行中前后不一致。
	 */
	globalThis.$argument.Storage = undefined;
	try {
		environment = getStorage(name, platforms, database);
	} finally {
		globalThis.$argument.Storage = argumentStorage;
	}
	const { Settings, Caches, Configs } = environment;
	if (KV) {
		for (const platform of [platforms].flat(Number.POSITIVE_INFINITY)) {
			_.merge(Caches, await KV.getItem(`@${name}.${platform}.Caches`, {}));
		}
	}
	/***************** Settings *****************/
	Console.info(`typeof Settings: ${typeof Settings}`, `Settings: ${JSON.stringify(Settings, null, 2)}`);
	/***************** Caches *****************/
	//Console.debug(`typeof Caches: ${typeof Caches}`, `Caches: ${JSON.stringify(Caches, null, 2)}`);
	/***************** Configs *****************/
	Console.log("✅ Set Environment Variables");
	return { Settings, Caches, Configs };
}
