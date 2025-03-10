// @ts-check
import Mailgun from "mailgun-js";
import log from "../utils/log.js";
const mailgun = new Mailgun({
  // @ts-ignore
	apiKey: process.env.MAILGUN_API_KEY,
  // @ts-ignore
	domain: process.env.DOMAIN,
	host: process.env.MAILGUN_HOST,
});

/**
  @param {string[]} toArr - Recipient list
  @param {import("../index.js").MessageJoin[]} listOfMessages - List of messages
  @returns {Promise<void>}
*/
export default async function sendEmail(toArr, listOfMessages) {
	log.debug("[sendEmail] messages to send:", listOfMessages);
	if (!listOfMessages.length) {
		log.error("[sendEmail] no messages for upcoming days, not sending emails");
		return;
	}

	const html = listOfMessages
		.map((message) => {
			return `<strong>${message.dateConcerning}</strong><br/>${message.message}`;
		})
		.join("<br/><br/>");

	for (const to of toArr) {
		const mailOptions = {
			from: process.env.FROM,
			to,
			subject: `Планирано спиране на тока за ${[
				...new Set(listOfMessages.map((el) => el.name)),
			].join(", ")}`,
			html,
		};

		await new Promise((resolve, reject) => {
			mailgun.messages().send(mailOptions, (err, body) => {
				if (err) {
					log.error("[sendEmail]", err);
					reject();
					throw new Error([err.statusCode, err.message].join('\n'));
				} else {
					log.debug("Email sent:", body);
					resolve('Email sent');
				}
			});
		});
	}
}
