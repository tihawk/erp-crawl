import dotenv from 'dotenv'
dotenv.config()
import Mailgun from 'mailgun-js'
import log from '../utils/log.js'
const mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.DOMAIN, host: process.env.MAILGUN_HOST})

export default async function sendEmail(toArr, listOfMessages, townOfInterest) {
    log.debug('[sendEmail] messages found:', listOfMessages)
    if (!listOfMessages.length) {
        log.error('[sendEmail] no messages for upcoming days, not sending emails')
        return
    }

    const html = listOfMessages.map(message => {
        return `<strong>${message.dateConcerning}</strong><br/>${message.message}`
    }).join('<br/><br/>')

    for (const to of toArr) {
        const mailOptions = {
            from: process.env.FROM,
            to,
            subject: `Планирано спиране на тока за ${townOfInterest}`,
            html
        }

        await mailgun.messages().send(mailOptions, (err, body) => {
            if (err) {
                log.error('[sendEmail]', err)
            } else {
                log.debug('Email sent:', body)
            }
        })
    }
}
