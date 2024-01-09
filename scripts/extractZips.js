const fs = require('fs');
const { execSync } = require('child_process');

const filesToExtract = fs.readdirSync('./zips');

console.log('Cleaning up old files');

//handling csvs folder
if (fs.existsSync('./csv')) fs.rmSync('./csv', { recursive: true, force: true });
fs.mkdirSync('./csv');

const zipsToExtract = fs.readdirSync('./zips');

console.log(zipsToExtract);

zipsToExtract.forEach(async (zipName, i) => {
  const feed = zipName.replace('.zip', '');

  try {
    console.log(`Unzipping ${feed}...`);
    fs.mkdirSync(`./csv/${feed}`);
    execSync(`unzip -o ./zips/${feed}.zip -d ./csv/${feed}`);
    console.log(`Unzipped ${feed} to ./csv/${feed} (${i}/${zipsToExtract.length})`);
  } catch (e) {
    console.log(`Error unzipping ${feed}`);
    fs.rmSync(`./csv/${feed}`, { recursive: true, force: true }); //remove empty folder
  }
})