const {
  processHeaders,
  processURL,
} = require('./helpers.js');
const fs = require('fs');
const fetch = require('node-fetch');
const feeds = require('../feeds.js');

// dot env
require('dotenv').config();

console.log('Cleaning up old files');

//handling zips folder
if (fs.existsSync('./zips')) fs.rmSync('./zips', { recursive: true, force: true });
fs.mkdirSync('./zips');

console.log('Old files cleaned up');

const feedKeys = Object.keys(feeds);

feedKeys.forEach((feedKey, i) => {
  const feed = feeds[feedKey];

  if (feed.disabled || feed.activeTypes.length == 0) {
    console.log(`${feed.name} is disabled`)
    return;
  }

  console.log(`Starting on ${feed.name}`);

  fetch(processURL(feed.url, feed.urlEnv), {
    method: "GET",
    headers: processHeaders(feed.headers),
    signal: AbortSignal.timeout(1800000) //30 minutes
  })
    .then(
      (res) => {
        if (res.status !== 200) throw new Error(`Error downloading ${feedKey}`)

        const dest = fs.createWriteStream(`./zips/${feedKey}.zip`)
        res.body.pipe(dest);
        res.body.on("end", () => {
          console.log(`Finished downloading feed: ${feedKey} (${i + 1} / ${feedKeys.length})`);
        });
      }
    )
    .catch(e => {
      console.log(e)
    })
})