// @ts-check
import puppeteer from "puppeteer";
import { pageLogger, timeout } from "../utils/index.js";
import log from "../utils/log.js";

/**
  The message object
  @typedef {Object} Message
  @property {string} dateConcerning - The header of the message, indicating when is the message valid for.
  @property {string} message - The message itself.
  @property {string} townOfInterest - The name of the location - found inside the message.
  @property {number} cityNumber - The number associated with the city the townOfInterest was searched for in.
*/

/**
  Location checking request param
  @typedef {Object.<number, string[]>} Locations
*/

/**
  @param {string} string - Date in EU formatted string
  @return {Date} A JS date object
*/
function getDateFromEuString(string) {
	const strArr = string.split(".");
	const newStr = strArr.reverse().join("-").concat(" 00:00 GMT");
	const dateObj = new Date(newStr);
	return dateObj;
}

/**
  @param {Message[]} _messages - A list of messages
  @returns {Message[]} Filtered messages by current date
*/
function filterMessagesByDate(_messages) {
	const reDate = /(\d\d\.\d\d\.\d\d\d\d)/gi;
	/**@type {Message[]}*/
	const result = [];
	const dateToday = new Date();
	const dateTodayString = `${dateToday.getDate()}.${
		dateToday.getMonth() + 1
	}.${dateToday.getFullYear()}`;

	for (const m of _messages) {
		const match = m.dateConcerning.match(reDate);
		if (!match) {
			log.error("[filterMessagesByDate]", "weird... no date in header?");
			result.push(m);
			continue;
		}

		// Take the last date mentioned in heading, and compare it to today
		if (
			getDateFromEuString(match[match.length - 1]) >=
			getDateFromEuString(dateTodayString)
		) {
			result.push(m);
		} else {
			log.debug(
				"[filterMessagesByDate] message filtered because dates are from the past",
				match,
			);
		}
	}

	return result;
}

/**
  @param {Locations} locations
  @returns {Promise<Message[]>}
*/
export default async function run(
	url = "https://erpsever.bg/bg/prekysvanija",
	locations = { 1: ["Страшимирово"] },
) {
	const browser = await puppeteer.launch({
		// headless: false,
		args: ["--no-sandbox"],
		defaultViewport: {
			width: 1366,
			height: 768,
		},
		devtools: false, // true for nonheadless Browser with devtools opened
	});

	/**@type {Message[]}*/
	let result = [];
	try {
		// open browser and get the page
		const pages = await browser.pages();
		let p;
		if (pages.length > 0) p = pages[0];
		else p = await browser.newPage();
		const page = p;

		// console listener for the page
		page.on("console", pageLogger);

		await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 }); // prevent timeout error and not scraping feed
		await timeout(1000);

		for (const cityNumber of Object.keys(locations)) {
			log.debug("[run] Selecting City number", cityNumber);
			await Promise.all([
				page.evaluate((_cityNumber) => {
					// @ts-ignore
					document.querySelector(`div[data-item="${_cityNumber}"]`).click();
					// @ts-ignore
				}, cityNumber),
				page.evaluate(() => {
					// @ts-ignore
					document.querySelector("input[id=all_active]").click();
				}),
				// page.waitForNavigation({waitUntil: 'networkidle0', timeout: 30000})
			]);

			await page.waitForSelector("ul#interruption_areas");
			await timeout(2000);

			log.debug("[run] Start Crawling Feed");

			for (const townOfInterest of locations[cityNumber]) {
				/**@type {Message[]}*/
				result = [
					...result,
					...(await page.evaluate(
						(townOfInterest, cityNumber) => {
							/**@type {Message[]}*/
							const result = [];
							const element = document.querySelector("ul#interruption_areas");
							const feedElements =
								element != null ? Array.from(element.childNodes) : [];

							for (const liNode of feedElements) {
								// @ts-ignore
								if (liNode.tagName === "LI") {
									// console.log('element is valid')
								} else {
									continue;
								}

								// log.debug('[run] getting date and message')
								const dateConcerning = liNode
									// @ts-ignore
									.getElementsByClassName("period")[0]
									.innerText.toString()
									.replace(/(\s+)/gi, " ")
									.trim();
								const message = liNode
									// @ts-ignore
									.getElementsByClassName("text")[0]
									.innerText.toString()
									.replace(/(\s+)/gi, " ")
									.trim();

								if (message.includes(townOfInterest)) {
									console.log(
										`[run] town of ${townOfInterest} is mentioned in message`,
									);
									// console.log(dateConcerning, message)
									result.push({
										dateConcerning,
										message,
										// @ts-ignore
										townOfInterest,
										// @ts-ignore
										cityNumber,
									});
								} else {
									continue;
								}
							}

							return result;
						},
						townOfInterest,
						cityNumber,
					)),
				];
			}
		}
		result = filterMessagesByDate(result);
	} catch (e) {
		await browser.close();
		throw e;
	}

	return result;
}

/**
  @param {Locations} locations
*/
export async function debug(locations = { 1: ["Страшимирово"] }) {
	const url = "https://erpsever.bg/bg/prekysvanija";

	const res = [];

	try {
		res.push(await run(url, locations));
	} catch (e) {
		log.error("caught exeption", e);
	}

	log.debug(res);
}
