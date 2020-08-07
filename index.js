
require('dotenv').config()
const run = require('./crawler/index')
const sendEmail = require('./mailer/index')

const townOfInterest = 'Страшимирово'

run(undefined, undefined, townOfInterest).then(async messages => {
    await sendEmail(process.env.ONLY_ME.split(';'), messages, townOfInterest)
    new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(process.exit())
        }, 2000)
    })
})