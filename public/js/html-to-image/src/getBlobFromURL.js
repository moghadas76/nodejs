import { getDataURLContent } from './utils'


const TIMEOUT = 30000

// KNOWN ISSUE
// -----------
// Can not handle redirect-url, such as when access 'http://something.com/avatar.png'
// will redirect to 'http://something.com/65fc2ffcc8aea7ba65a1d1feda173540'


export default function getBlobFromURL(url: String, options: Object): Promise<Blob> {
  // cache bypass so we dont have CORS issues with cached images
  // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
  if (options.cacheBust) {
    url += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime() // eslint-disable-line
  }

  const failed = (err) => {
    let placeholder = ''
    if (options.imagePlaceholder) {
      const split = options.imagePlaceholder.split(/,/)
      if (split && split[1]) {
        placeholder = split[1] // eslint-disable-line
      }
    }

    let msg = `Failed to fetch resource: ${url}`

    if (err) {
      msg = typeof err === 'string' ? err : err.message
    }

    if (msg) {
      console.error(msg) // eslint-disable-line
    }

    return placeholder
  }

  const deferred = window.fetch
    // fetch
    ? window.fetch(url)
      .then(response => response.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }))
      .then(getDataURLContent)
      .catch(() => new Promise((resolve, reject) => {
        reject()
      }))

    // xhr
    : new Promise(((resolve, reject) => {
      const req = new XMLHttpRequest()

      const timeout = () => {
        reject(new Error(`Timeout of ${TIMEOUT}ms occured while fetching resource: ${url}`))
      }

      const done = () => {
        if (req.readyState !== 4) {
          return
        }

        if (req.status !== 200) {
          reject(new Error(`Failed to fetch resource: ${url}, status: ${req.status}`))
          return
        }

        const encoder = new FileReader()
        encoder.onloadend = () => {
          resolve(getDataURLContent(encoder.result))
        }
        encoder.readAsDataURL(req.response)
      }

      req.onreadystatechange = done
      req.ontimeout = timeout
      req.responseType = 'blob'
      req.timeout = TIMEOUT
      req.open('GET', url, true)
      req.send()
    }))

  return deferred.catch(failed)
}
