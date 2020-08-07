const Mailgun = require('mailgun-js')

const mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.DOMAIN, host: process.env.MAILGUN_HOST})

async function sendEmail (toArr, listOfMessages, townOfInterest) {
    console.log(listOfMessages)

    const html = listOfMessages.map(message => {
        return `<strong>${message.dateConcerning}</strong><br/><br/>${message.message}`
    }).join('\n')

    for (const to of toArr) {
        const mailOptions = {
            from: process.env.FROM,
            to,
            subject: `Планирано спиране на тока за ${townOfInterest}`,
            html
        }

        await mailgun.messages().send(mailOptions, (err, body) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Email sent:', body)
            }
        })
    }
}

module.exports = sendEmail