const fs = require('fs');
const { Worker } = require("worker_threads");
const feedConfigs = require('../feeds.json');

console.log('Cleaning up old files');

//handling output folders
if (fs.existsSync('./shapes')) fs.rmSync('./shapes', { recursive: true, force: true });
fs.mkdirSync('./shapes');
if (fs.existsSync('./schedules')) fs.rmSync('./schedules', { recursive: true, force: true });
fs.mkdirSync('./schedules');

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

  /*
  new Worker(
    __dirname + "/processSchedulesWorker.js",
    {
      workerData: {
        chunk,
        feedConfigs
      }
    }
  );
  */
}