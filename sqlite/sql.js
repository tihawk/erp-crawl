import log from "../utils/log.js"
import { execute, executeReturning, fetchFirst } from "./helpers.js"
const townOfInterest = process.env.TOWN_OF_INTEREST

export const createTables = async (db) => {
  await execute(db,
    `CREATE TABLE IF NOT EXISTS recipient (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT
      )`
  )
  await execute(db,
    `CREATE TABLE IF NOT EXISTS location (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )`
  )
  await execute(db,
    `CREATE TABLE IF NOT EXISTS recipient_location (
        recipient_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        PRIMARY KEY (recipient_id, location_id),
        FOREIGN KEY (recipient_id)
          REFERENCES recipient (id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
        FOREIGN KEY (location_id)
          REFERENCES location (id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
      )`
  )
  await execute(db,
    `CREATE TABLE IF NOT EXISTS message (
        id INTEGER PRIMARY KEY,
        location_id INTEGER NOT NULL,
        hash TEXT NOT NULL UNIQUE,
        dateConcerning TEXT NOT NULL,
        message TEXT NOT NULL,
        FOREIGN KEY (location_id)
          REFERENCES location (id)
            ON UPDATE RESTRICT 
            ON DELETE RESTRICT 
      )`
  )
  await execute(db,
    `CREATE TABLE IF NOT EXISTS recipient_message (
        recipient_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        isSent INTEGER NOT NULL DEFAULT FALSE,
        PRIMARY KEY (recipient_id, message_id),
        FOREIGN KEY (recipient_id)
          REFERENCES recipient (id)
            ON UPDATE CASCADE 
            ON DELETE CASCADE,
        FOREIGN KEY (message_id)
          REFERENCES message (id)
            ON UPDATE CASCADE
            ON DELETE CASCADE 
      )`
  )

}

export const importStartingData = async (db) => {
  let location
  try {
    location = await executeReturning(db,
      'INSERT INTO location(name) VALUES (?) RETURNING *', [townOfInterest])
  } catch (e) {
    log.error('[importInitialLocations]', e)
    location = await fetchFirst(db,
      'SELECT * FROM location WHERE name = ?', [townOfInterest])
  }

  for (const recpt of process.env.RECEPIENT_LIST.split(';')) {
    let recptDb
    try {
      recptDb = await executeReturning(db,
        'INSERT INTO recipient(email) VALUES (?) RETURNING *', [recpt])
    } catch (e) {
      log.error('[importInitialRecipients]', e)
      recptDb = await fetchFirst(db,
        'SELECT * FROM recipient WHERE email = ?', [recpt])
    }

    try {
      await execute(db, `INSERT INTO recipient_location(
        recipient_id,
        location_id) VALUES(?, ?)`,
        [recptDb.id, location.id])
    } catch (e) {
      log.error('[importInitialRecipientLocations]', e)
    }
  }
}

export const insertMessageReturningSql = `INSERT INTO message(
      dateConcerning,
      message,
      hash,
      location_id
    ) VALUES(?, ?, ?, ?) RETURNING *`

export const insertRecipientMessageSql = `INSERT INTO recipient_message(
      recipient_id,
      message_id
    ) VALUES(?, ?)`
