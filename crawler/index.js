import puppeteer from 'puppeteer'
import { pageLogger, timeout } from '../utils/index.js'

/**
  @param {string} string - Date in EU formatted string
  @return {Date} A JS date object
*/
function getDateFromEuString (string) {
    const strArr = string.split('.')
    const newStr = strArr.reverse().join('-').concat(' 00:00 GMT')
    const dateObj = new Date(newStr)
    return dateObj
}

/**
  @param {string[]} _messages - A list of messages
  @returns {string[]} Filtered messages by current date
*/
function filterMessagesByDate (_messages) {
    const reDate = /(\d\d\.\d\d\.\d\d\d\d)/gi
    const result = []
    const dateToday = new Date()
    const dateTodayString = `${dateToday.getDate()}.${dateToday.getMonth() + 1}.${dateToday.getFullYear()}`

    for (const m of _messages) {
        const match = m.dateConcerning.match(reDate)

        // take the last date mentioned in heading, and compare it to today
        if (getDateFromEuString(match[match.length - 1]) >= getDateFromEuString(dateTodayString)) {
            result.push(m)
        } else {
            console.log('[filterMessagesByDate] message filtered because dates are from the past', match)
        }
    }

    return result
}

export default async function run(url = 'https://erpsever.bg/bg/prekysvanija', cityNumber = '1', townOfInterest = 'Страшимирово') {
    const browser = await puppeteer.launch({
        // headless: false,
        args: ['--no-sandbox'],
        defaultViewport: {
            width: 1366,
            height: 768
        },
        devtools: false // true for nonheadless Browser with devtools opened
    })

    let result
    try {
        // open browser and get the page
        const pages = await browser.pages()
        let p
        if (pages.length > 0) p = pages[0]
        else p = await browser.newPage()
        const page = p

        // console listener for the page
        page.on('console', pageLogger)

        await page.goto(url, {waitUntil: 'networkidle0', timeout: 30000}) // prevent timeout error and not scraping feed
        await timeout(1000)

        console.log('[run] Selecting City number', cityNumber)
        await Promise.all([
            page.evaluate(_cityNumber => {
                document.querySelector(`div[data-item="${_cityNumber}"]`).click()
            }, cityNumber),
            // page.waitForNavigation({waitUntil: 'networkidle0', timeout: 30000})
        ])

        await page.waitForSelector('ul#interruption_areas')
        await timeout(2000)

        console.log('[run] Start Crawling Feed')

        const documentIdElements = await page.evaluate(_townOfInterest => {
            const result = []
            const feedElements = Array.from(document.querySelector('ul#interruption_areas').childNodes)

            for (const liNode of feedElements) {
                if (liNode.tagName === 'LI') {
                    // console.log('element is valid')
                } else {
                    continue
                }

                // console.log('[run] getting date and message')
                const dateConcerning = liNode.getElementsByClassName('period')[0].innerText.toString().replace(/(\s+)/gi, ' ').trim()
                const message = liNode.getElementsByClassName('text')[0].innerText.toString().replace(/(\s+)/gi, ' ').trim()

                if(message.includes(_townOfInterest)) {
                    console.log(`[run] town of ${_townOfInterest} is mentioned in message`)
                    // console.log(dateConcerning, message)
                    result.push({dateConcerning, message})
                } else {
                    continue
                }

            }

            return result
        }, townOfInterest)

        result = filterMessagesByDate(documentIdElements)

    } catch (e) {
        await browser.close()
        throw e
    }

    return result
}

export async function debug() {
    const url = 'https://erpsever.bg/bg/prekysvanija'
  
    const res = []
  
    try {
        res.push(await run(url))
    } catch (e) {
        console.error('caught exeption', e) 
    }
    
    console.log(res)
}
