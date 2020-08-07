const puppeteer = require('puppeteer')
const { elementReady, pageLogger, timeout } = require('../utils')

// async function parseFeed () {
//     try {
//         await Promise.all([
//             elementReady('div.map-interruptions', 5000, 1000),
//             elementReady('div.interruption-data', 5000, 1000)
//         ])

//         if (document.querySelector('div.interruption-data') === null) {
//             console.log('Reloading:', location.href.toString())
//             return 'RELOAD'
//         }

//     } catch (e) {
//         console.log('PARSING Error')
//         console.log(e.toString())
//         return
//     }
// }

// async function getFeedItemData (page, documentIdElement, dateConcerning) {
//     try {

//     } catch (e) {
//         console.log('Error while parsing', e, documentIdElement)
//     }
// }

async function run (url = 'https://erpsever.bg/bg/prekysvanija', cityNumber = '1', townOfInterest = 'Страшимирово') {
    const browser = await puppeteer.launch({
        defaultViewport: {
            width: 1366,
            height: 768
        },
        devtools: false // true for nonheadless Browser with devtools opened
    })

    let result
    try {
        // open browser and get the page
        let pages = await browser.pages()
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

        let documentIdElements = await page.evaluate(_townOfInterest => {
            const result = []
            let feedElements = Array.from(document.querySelector('ul#interruption_areas').childNodes)

            for (const liNode of feedElements) {
                if (liNode.tagName === 'LI') {
                    // console.log('element is valid')
                } else {
                    continue
                }

                // console.log('[run] getting date and message')
                let dateConcerning = liNode.getElementsByClassName('period')[0].innerText.toString().replace(/(\s+)/gi, ' ').trim()
                let message = liNode.getElementsByClassName('text')[0].innerText.toString().replace(/(\s+)/gi, ' ').trim()

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

        result = documentIdElements
    } catch (e) {
        await browser.close()
        throw e
    }

    return result
}

async function debug () {
    const url = 'https://erpsever.bg/bg/prekysvanija'
  
    const res = []
  
    try {
        res.push(await run(url))
    } catch (e) {
        console.error('caught exeption', e) 
    }
    
    console.log(res)
}
  
//   debug()
  
  module.exports = run
  