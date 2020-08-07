// const FeedItemModel = require('./FeedItemModel')

/**
 * Promised Timeout variant
 * @param ms Time in Milliseconds to wait
 * @returns {Promise<any>} Finished waiting
 */
async function timeout (ms) { return new Promise(res => setTimeout(res, ms))}

/**
 * Wait for Element to be attached to the document
 * @param selector Element selector
 * @param _timeout _Optional_ Fallback timeout
 * @param preTimeout _Optional_ Prewatch timeout
 * @returns {Promise<any>} Selector is fullfilled
 */
async function elementReady (selector, _timeout = 1000000, preTimeout= null) {
  const readyPromise = new Promise(async (resolve, reject) => {
    if (preTimeout) await timeout(preTimeout)
    let el = document.querySelector(selector)
    if (el) {resolve(el)}
    new MutationObserver((mutationRecords, observer) => {
      Array.from(document.querySelectorAll(selector)).forEach((element) => {
        resolve(element)
        observer.disconnect()
      })
    })
      .observe(document.documentElement, {
        childList: true,
        subtree: true
      })
  })
  return Promise.race([timeout(_timeout), readyPromise])
}

/**
 * Experimental Function to wait for page to be idle and then wait for timeout to be finished
 * @param ms Time in Milliseconds to wait after idle
 * @returns {Promise<any>} Window idle and timeout finished
 */
async function idle (ms) {
 return new Promise(res => {
    window.requestIdleCallback(async () => {
      console.log('window idle')
      await timeout(ms)
      res()
    })
  })
}

function pageLogger (msg) {
  if (msg._location && msg._location.url !== '__puppeteer_evaluation_script__') return
  for (let i = 0; i < msg.args().length; ++i) {
    if (msg.args()[i]._remoteObject) {
      console.log(`${new Date()} [PageConsole]`, msg.args()[i]._remoteObject.value)
    }
  }
}

module.exports = {
//   FeedItemModel,
  timeout,
  elementReady,
  idle,
  pageLogger
}
