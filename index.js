import 'dotenv/config.js'
import sqlite3 from 'sqlite3'
import run from './crawler/index.js'
import sendEmail from './mailer/index.js'
import { execute, fetchFirst, fetchAll, executeReturning } from './sqlite/helpers.js'
import log from './utils/log.js'
import { stringToSha256 } from './utils/index.js'
import { createTables, importStartingData, insertMessageReturningSql, insertRecipientMessageSql } from './sqlite/sql.js'

const townOfInterest = process.env.TOWN_OF_INTEREST

const main = async () => {
  const db = new sqlite3.Database('erp.db')
  try {
    await createTables(db)
  } catch (e) {
    log.error('[db.execute]', e)
    db.close()
    process.exit(1)
  }

  try {
    await importStartingData(db)
  } catch (e) {
    log.error('[db.execute]', e)
  } finally {
    db.close()
  }

  run(undefined, undefined, townOfInterest).then(async messages => {
    const messagesToSend = {}
    const db = new sqlite3.Database('erp.db')
    const location = await fetchFirst(db,
      'SELECT * FROM location WHERE name = ?', [townOfInterest]);
    const recipientLocationJoin = await fetchAll(db,
      'SELECT * FROM recipient_location WHERE location_id = ?', [location.id])

    log.debug('[main] found', messages.length, 'messages about', townOfInterest)

    for (const msg of messages) {
      try {
        const message = await executeReturning(db, insertMessageReturningSql,
          [
            msg.dateConcerning,
            msg.message,
            stringToSha256([msg.dateConcerning, msg.message].join(': ')),
            location.id
          ]
        )

        for (const recpt of recipientLocationJoin) {
          await execute(db, insertRecipientMessageSql, [recpt.recipient_id, message.id])
        }

      } catch (e) {
        log.error('[db.execute]', e)
      }
    }

    try {
      const theJoin = await fetchAll(db, `SELECT * FROM recipient
          LEFT JOIN
            (recipient_message LEFT JOIN message ON recipient_message.message_id = message.id)
            recipient_message
            ON recipient.id = recipient_message.recipient_id
            WHERE isSent = FALSE`
      )

      log.debug('There are', theJoin.length, 'undelivered message.',
      'Will attempt to deliver them now.')

      for (const msg of theJoin) {
        if (!messagesToSend[msg.email]) {
          messagesToSend[msg.email] = []
        }
        messagesToSend[msg.email].push(msg)
      }

      for (const recpt of Object.keys(messagesToSend)) {
        await sendEmail([recpt], messagesToSend[recpt], townOfInterest)
        execute(db, `UPDATE recipient_message
          SET isSent = TRUE
          WHERE recipient_id = ?`,
          [messagesToSend[recpt][0].recipient_id])
      }
    } catch (e) {
      log.error(e)
    } finally {
      db.close()
    }

    new Promise((resolve, _) => {
      setTimeout(() => {
        resolve(process.exit())
      }, 2000)
    })
  })
}

main()
