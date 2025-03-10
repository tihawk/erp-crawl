// @ts-check
import "dotenv/config.js";
import sqlite3 from "sqlite3";
import run from "./crawler/index.js";
import sendEmail from "./mailer/index.js";
import {
	execute,
	fetchFirst,
	fetchAll,
	executeReturning,
} from "./sqlite/helpers.js";
import log from "./utils/log.js";
import { stringToSha256 } from "./utils/index.js";
import {
	createTables,
	importStartingData,
	insertMessageReturningSql,
	insertRecipientMessageSql,
} from "./sqlite/sql.js";

/**
  @typedef {Object} MessageJoin
  @property {number} id
  @property {string} email - Recipient email
  @property {string} name - Name of location (townOfInterest)
  @property {number} recipient_id
  @property {number} message_id
  @property {number} location_id
  @property {number} isSent - int-encoded boolean whether the message has been succesfully sent via email
  @property {string} hash - A hash value for the dateConcerning and message fields
  @property {string} dateConcerning
  @property {string} message
*/

/**@type {import('./crawler/index.js').Locations}*/
let requestLocations = {};

const main = async () => {
	const db = new sqlite3.Database("erp.db");
	try {
		await createTables(db);
	} catch (e) {
		log.error("[db.execute]", e);
		db.close();
		process.exit(1);
	}

	try {
		await importStartingData(db);

		const locations = await fetchAll(db, "SELECT * FROM location");
		requestLocations = {
			1: [...locations.map((loc) => loc.name)],
		};
	} catch (e) {
		log.error("[db.execute]", e);
	} finally {
		db.close();
	}

	await run(undefined, requestLocations).then(async (messages) => {
		const db = new sqlite3.Database("erp.db");

		try {
			await storeMessages(db, messages);
			await sendUnsentMessages(db);
		} catch (e) {
			log.error(e);
		} finally {
			log.debug("Closing db connection.");
			db.close();
		}

	});

	new Promise((resolve, _) => {
		setTimeout(() => {
			resolve(process.exit());
		}, 2000);
	});
};

/**
  Store crawled messages to DB
  @param {sqlite3.Database} db
  @param {import('./crawler/index.js').Message[]} messages
  @returns {Promise<void>}
*/
const storeMessages = async (db, messages) => {
	log.debug(
		"[main] found",
		messages.length,
		"messages for all locations of interest",
	);

	for (const msg of messages) {
		try {
			const location = await fetchFirst(
				db,
				"SELECT * FROM location WHERE name = ?",
				[msg.townOfInterest],
			);
			const recipientLocationJoin = await fetchAll(
				db,
				"SELECT * FROM recipient_location WHERE location_id = ?",
				[location.id],
			);

			const message = await executeReturning(db, insertMessageReturningSql, [
				msg.dateConcerning,
				msg.message,
				stringToSha256([msg.dateConcerning, msg.message].join(": ")),
				location.id,
			]);

			for (const recpt of recipientLocationJoin) {
				await execute(db, insertRecipientMessageSql, [
					recpt.recipient_id,
					message.id,
				]);
			}
		} catch (e) {
			log.error("[db.execute]", e);
		}
	}
};

/**
  Find any unsent messages, and attempt to send them via email
  @param {sqlite3.Database} db
  @returns {Promise<void>}
*/
const sendUnsentMessages = async (db) => {
	const messagesToSend = {};

	try {
    /**@type {MessageJoin[]}*/
		const theJoin = await fetchAll(
			db,
			`SELECT * FROM recipient
          LEFT JOIN
            (recipient_message INNER join
              (message INNER JOIN location ON message.location_id = location.id)
              message ON recipient_message.message_id = message.id
            )
            recipient_message
            ON recipient.id = recipient_message.recipient_id
            WHERE isSent = FALSE`,
		);

		log.debug(
			"There are",
			theJoin.length,
			"undelivered messages.",
			"Will attempt to deliver them now.",
		);

		for (const msg of theJoin) {
			if (!messagesToSend[msg.email]) {
				messagesToSend[msg.email] = [];
			}
			messagesToSend[msg.email].push(msg);
		}

		for (const recpt of Object.keys(messagesToSend)) {
			await sendEmail([recpt], messagesToSend[recpt]);
			execute(
				db,
				`UPDATE recipient_message
          SET isSent = TRUE
          WHERE recipient_id = ?`,
				[messagesToSend[recpt][0].recipient_id],
			);
		}
	} catch (e) {
		log.error(e);
	}
};

main();
