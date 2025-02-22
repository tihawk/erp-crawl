import 'dotenv/config.js'
import run from './crawler/index.js'
import sendEmail from './mailer/index.js'

const townOfInterest = 'Страшимирово'

run(undefined, undefined, townOfInterest).then(async messages => {
    await sendEmail(process.env.RECEPIENT_LIST.split(';'), messages, townOfInterest)
    new Promise((resolve, _) => {
        setTimeout(() => {
            resolve(process.exit())
        }, 2000)
    })
})
