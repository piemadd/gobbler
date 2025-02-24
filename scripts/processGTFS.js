const fs = require('fs');
const { Worker } = require("worker_threads");
const { processSchedules } = require('./processSchedulesWorker');

console.log('Cleaning up old files');

//handling output folders
if (fs.existsSync('./shapes')) fs.rmSync('./shapes', { recursive: true, force: true });
fs.mkdirSync('./shapes');
if (fs.existsSync('./schedules')) fs.rmSync('./schedules', { recursive: true, force: true });
fs.mkdirSync('./schedules');

const feeds = fs.readdirSync('./csv');

console.log('Dispatching workers')
const chunkSize = feeds.length / (process.env.CF_PAGES ? process.env.CF_PAGES : 16); // only 1 at a time on cf pages
for (let i = 0; i < feeds.length; i += chunkSize) {
  const chunk = feeds.slice(i, i + chunkSize);

  if (!process.env.CF_PAGES || process.env.CF_PAGES != '1') {
    new Worker(
      __dirname + "/processShapesWorker.js",
      {
        workerData: {
          chunk
        }
      }
    );
  }

  processSchedules(chunk);
}