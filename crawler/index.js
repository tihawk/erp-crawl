const puppeteer = require('puppeteer')
const { elementReady, pageLogger, timeout } = require('../utils')

async function parseFeed () {
    try {
        await Promise.all([
            elementReady('div.map-interruptions', 5000, 1000),
            elementReady('div.interruption-data', 5000, 1000)
        ])

        if (document.querySelector('div.interruption-data') === null) {
            console.log('Reloading:', location.href.toString())
            return 'RELOAD'
        }

    } catch (e) {
        console.log('PARSING Error')
        console.log(e.toString())
        return
    }
}

async function getFeedItemData (page, documentIdElement, dateConcerning) {
    try {

    } catch (e) {
        console.log('Error while parsing', e, documentIdElement)
    }
}

async function run (url, cityNumber = '1') {
    const browser = await puppeteer.launch({
        defaultViewport: {
            width: 1366,
            height: 768
        },
        devtools: true // true for nonheadless Browser with devtools opened
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

        console.log('[run] selecting city')
        await Promise.all([
            page.evaluate(_cityNumber => {
                document.querySelector(`div[data-item="${_cityNumber}"]`).click()
            }, cityNumber),
            // page.waitForNavigation({waitUntil: 'networkidle0', timeout: 30000})
        ])

        console.log('hi')
        await page.waitForSelector('ul#interruption_areas')
        await timeout(2000)

        console.log('[run] Start Crawiling Feed')

        let documentIdElements = await page.evaluate(() => {
            const result = []
            let feedElements = Array.from(document.querySelector('ul#interruption_areas').childNodes)

            for (const liNode of feedElements) {
                if (liNode.tagName === 'LI') {
                    // console.log('element is valid')
                } else {
                    continue
                }

                let dateConcerning = (Array.from(liNode.getElementsByTagName('div')).forEach(span => span.innerText))
                result.push(dateConcerning)
            }

            return result
        })

        // console.log(documentIdElements)
    } catch (e) {
        await browser.close()
        throw e
    }
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
  
  debug()
  
  module.exports = run
  