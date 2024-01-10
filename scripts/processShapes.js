const fs = require('fs');
const { Worker } = require("worker_threads");
const feedConfigs = require('../feeds.json');

console.log('Cleaning up old files');

//handling csvs folder
if (fs.existsSync('./shapes')) fs.rmSync('./shapes', { recursive: true, force: true });
fs.mkdirSync('./shapes');

const feeds = fs.readdirSync('./csv');

console.log('Dispatching workers')
const chunkSize = feeds.length / 16;
for (let i = 0; i < feeds.length; i += chunkSize) {
  const chunk = feeds.slice(i, i + chunkSize);

  new Worker(
    __dirname + "/processShapesWorker.js",
    {
      workerData: {
        chunk,
        feedConfigs
      }
    }
  );
}