
require('dotenv').config()
const run = require('./crawler/index')
const sendEmail = require('./mailer/index')

const townOfInterest = 'Страшимирово'

run(undefined, undefined, townOfInterest).then(messages => {
    sendEmail(process.env.ONLY_ME.split(';'), messages, townOfInterest)
})