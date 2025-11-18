//#region src/store/duration.ts
const setDuration = (days) => {
	const daysNumber = !days || Number.isNaN(Number(days)) ? void 0 : Number.parseInt(days.toString());
	if (!daysNumber) return;
	const date = /* @__PURE__ */ new Date();
	date.setTime(date.getTime() + daysNumber * 24 * 60 * 60 * 1e3);
	return date;
};
const durationElapsed = (date) => {
	if (!date) return false;
	const str = JSON.parse(date);
	const expires = Date.parse(str);
	if (Number.isNaN(expires)) return false;
	return expires < Date.now();
};

//#endregion
//#region src/store/chrome.ts
var ChromeExtensionStore = class {
	REMEMBER_DURATION_KEY = "storage-expiration";
	keyPrefix;
	constructor(keyPrefix = "idOS-") {
		this.keyPrefix = keyPrefix;
		this.checkRememberDurationElapsed();
	}
	async get(key) {
		const prefixedKey = `${this.keyPrefix}${key}`;
		const result = await chrome.storage.local.get(prefixedKey);
		return result[prefixedKey];
	}
	set(key, value) {
		const prefixedKey = `${this.keyPrefix}${key}`;
		return chrome.storage.local.set({ [prefixedKey]: value });
	}
	delete(key) {
		const prefixedKey = `${this.keyPrefix}${key}`;
		return chrome.storage.local.remove(prefixedKey);
	}
	async reset() {
		return new Promise((resolve) => {
			chrome.storage.local.get(null, (items) => {
				const keysToRemove = Object.keys(items).filter((key) => key.startsWith(this.keyPrefix));
				if (keysToRemove.length > 0) chrome.storage.local.remove(keysToRemove, () => {
					resolve();
				});
				else resolve();
			});
		});
	}
	async setRememberDuration(days) {
		const date = setDuration(days);
		if (!date) await chrome.storage.local.remove(this.REMEMBER_DURATION_KEY);
		else await chrome.storage.local.set({ [this.REMEMBER_DURATION_KEY]: JSON.stringify(date.toISOString()) });
		return Promise.resolve();
	}
	async checkRememberDurationElapsed() {
		if (await this.hasRememberDurationElapsed()) await this.reset();
	}
	async hasRememberDurationElapsed() {
		const value = await chrome.storage.local.get(this.REMEMBER_DURATION_KEY);
		try {
			return durationElapsed(value[this.REMEMBER_DURATION_KEY]);
		} catch (_) {
			await chrome.storage.local.remove(this.REMEMBER_DURATION_KEY);
			return false;
		}
	}
	pipeCodec({ encode, decode }) {
		return {
			...this,
			get: async (key) => {
				const result = await this.get(key);
				if (result) return decode(result);
			},
			set: async (key, value) => {
				await this.set(key, encode(value));
			}
		};
	}
};

//#endregion
//#region src/store/local.ts
var LocalStorageStore = class {
	keyPrefix;
	storage;
	REMEMBER_DURATION_KEY = "storage-expiration";
	constructor(storage = window.localStorage, keyPrefix = "idOS-") {
		this.storage = storage;
		this.keyPrefix = keyPrefix;
		this.checkRememberDurationElapsed();
	}
	#setLocalStorage(key, value) {
		this.storage.setItem(`${this.keyPrefix}${key}`, value);
	}
	#getLocalStorage(key) {
		return this.storage.getItem(`${this.keyPrefix}${key}`);
	}
	#removeLocalStorage(key) {
		this.storage.removeItem(`${this.keyPrefix}${key}`);
	}
	pipeCodec({ encode, decode }) {
		return {
			...this,
			get: async (key) => {
				const result = await this.get(key);
				if (result) return decode(result);
			},
			set: async (key, value) => {
				await this.set(key, encode(value));
			}
		};
	}
	get(key) {
		const value = this.#getLocalStorage(key);
		if (!value) return Promise.resolve(void 0);
		return Promise.resolve(JSON.parse(value));
	}
	setRememberDuration(days) {
		const date = setDuration(days);
		if (!date) this.#removeLocalStorage(this.REMEMBER_DURATION_KEY);
		else this.#setLocalStorage(this.REMEMBER_DURATION_KEY, JSON.stringify(date.toISOString()));
		return Promise.resolve();
	}
	async checkRememberDurationElapsed() {
		if (await this.hasRememberDurationElapsed()) await this.reset();
	}
	async hasRememberDurationElapsed() {
		const value = this.#getLocalStorage(this.REMEMBER_DURATION_KEY);
		try {
			return durationElapsed(value);
		} catch (_) {
			this.#removeLocalStorage(this.REMEMBER_DURATION_KEY);
			return false;
		}
	}
	set(key, value) {
		if (!key || typeof key !== "string") throw new Error(`Bad key: ${key}`);
		if (!value) return Promise.resolve();
		this.#setLocalStorage(key, JSON.stringify(value));
		return Promise.resolve();
	}
	delete(key) {
		this.#removeLocalStorage(key);
		return Promise.resolve();
	}
	async reset() {
		for (const key of Object.keys(this.storage)) if (key.startsWith(this.keyPrefix)) this.storage.removeItem(key);
	}
};

//#endregion
//#region src/store/memory.ts
var MemoryStore = class {
	REMEMBER_DURATION_KEY = "storage-expiration";
	keyPrefix;
	storage = /* @__PURE__ */ new Map();
	constructor(keyPrefix = "idOS-") {
		this.keyPrefix = keyPrefix;
	}
	async get(key) {
		if (this.hasRememberDurationElapsed()) {
			this.reset();
			return void 0;
		}
		return this.storage.get(`${this.keyPrefix}${key}`);
	}
	set(key, value) {
		this.storage.set(`${this.keyPrefix}${key}`, value);
		return Promise.resolve();
	}
	delete(key) {
		this.storage.delete(`${this.keyPrefix}${key}`);
		return Promise.resolve();
	}
	async reset() {
		this.storage.clear();
		return Promise.resolve();
	}
	async setRememberDuration(days) {
		const date = setDuration(days);
		if (!date) this.storage.delete(this.REMEMBER_DURATION_KEY);
		else this.storage.set(this.REMEMBER_DURATION_KEY, JSON.stringify(date.toISOString()));
		return Promise.resolve();
	}
	hasRememberDurationElapsed() {
		const value = this.storage.get(this.REMEMBER_DURATION_KEY);
		try {
			return durationElapsed(value);
		} catch (_) {
			this.storage.delete(this.REMEMBER_DURATION_KEY);
			return false;
		}
	}
	pipeCodec({ encode, decode }) {
		return {
			...this,
			get: async (key) => {
				const result = await this.get(key);
				if (result) return decode(result);
			},
			set: async (key, value) => {
				await this.set(key, encode(value));
			}
		};
	}
};

//#endregion
export { ChromeExtensionStore, LocalStorageStore, MemoryStore };
//# sourceMappingURL=store-CJsdFslr.js.map