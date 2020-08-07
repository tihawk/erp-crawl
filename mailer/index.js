const nodemailer = require('nodemailer')

async function sendEmail (toArr, listOfMessages, townOfInterest) {
    console.log(listOfMessages)

    const html = listOfMessages.map(message => {
        return `<strong>${message.dateConcerning}</strong><br/><br/>${message.message}`
    }).join('\n')

    const transporter = nodemailer.createTransport({
        host: 'smtp.abv.bg',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    })

    for (const to of toArr) {
        const mailOptions = {
            from: process.env.EMAIL,
            to,
            subject: `Планирано спиране на тока за ${townOfInterest}`,
            html
        }
    
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Email sent:', info.response)
            }
        })
    }

}

module.exports = sendEmail