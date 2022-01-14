module.exports = {
	clicked: async function(page, selector) {
		try {
			await page.waitForSelector(selector);
			await page.click(selector);
		} catch (error) {
			throw new Error(` Could not click on selector : ${selector}`);
		}
	},
	clickedMap: async function(page, selector) {
		try {
			await page.waitForSelector(selector);
			await page.$eval(selector, (button) => button.click());
		} catch (error) {
			throw new Error(` Could not click on selector : ${selector}`);
		}
	},
	clickedloop: async function(page, selector) {
		try {
			await page.$eval(selector, (button) => button.click());
		} catch (error) {
			throw new Error(` Could not click on selector : ${selector}`);
		}
	},
	getText: async function(page, selector) {
		try {
			await page.waitForSelector(selector);
			return await page.$eval(selector, (element) => element.innerHTML);
		} catch (error) {
			throw new Error(` Could not getText on selector : ${selector}`);
		}
	},
	getConut: async function(page, selector) {
		try {
			await page.waitForSelector(selector);
			return await page.$eval(selector, (element) => element.innerHTML);
		} catch (error) {
			throw new Error(` Could not getConut on selector : ${selector}`);
		}
	},
	typeText: async function(page, selector, text) {
		try {
			await page.waitForSelector(selector);
			return await page.type(selector, text);
		} catch (error) {
			throw new Error(` Could not typeText on selector : ${selector}`);
		}
	},
	typeSelect: async function(page, selector, text) {
		try {
			await page.waitForSelector(selector);
			return await page.select(selector, text);
		} catch (error) {
			throw new Error(` Could not typeSelect on selector : ${selector}`);
		}
	},
	waitForText: async function(page, selector, text) {
		try {
			await page.waitForSelector(selector);
			await page.waitForFunction((selector, text) => {
				document.querySelector(selector).innerText.includes(text), {}, selector, text;
			});
		} catch (error) {
			throw new Error(` Text: --- ${text} --- Could not !!!! waitForText!!!! on selector : --- ${selector} ---`);
		}
	},
	shouldNotExist: async function(page, selector) {
		try {
			await page.waitFor(() => !document.querySelector(selector));
		} catch (error) {
			throw new Error(` Text: ${text} Could not typeText on selector : ${selector}`);
		}
	},
	radio: async function(page, selector) {
		try {
			await page.waitForSelector(selector);
			await page.$eval(selector, (check) => (check.checked = true));
		} catch (error) {
			throw new Error(` Text: ${text} Could not typeText on selector : ${selector}`);
		}
	},
	selectDropdown: async function(page, selector, text) {
		try {
			const option = (await page.$x(`//*[@id = "${selector}"]/option[text() = "${text}"]`))[0];
			const value = await (await option.getProperty('value')).jsonValue();
			await page.select(`#${selector}`, value);
		} catch (error) {
			throw new Error(` Text: ${text} Could not typeText on selector : ${selector}`);
		}
	},
	fileChooser: async function(page, selector,file) {
		try {
			const [ fileChooser1 ] = await Promise.all([
				page.waitForFileChooser(),
				page.click(selector)
			]);
			await fileChooser1.accept([ file ]);
		} catch (error) {
			throw new Error(` Text: ${text} Could not typeText on selector : ${selector}`);
		}
	},
};
