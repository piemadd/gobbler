const fs = require('fs');

const shapesToCombine = fs.readdirSync('./shapes');
const amtrakerFileNames = ['via_rail.geojson', 'nationalRoute.json', 'brightline.geojson'];

let features = [];
let amtrakerFeatures = [];

shapesToCombine.forEach((fileName) => {
  const file = JSON.parse(fs.readFileSync(`./shapes/${fileName}`, { encoding: 'utf8' }));
  features.push(...file.features);
});

amtrakerFileNames.forEach((fileName) => {
  const file = JSON.parse(fs.readFileSync(`./shapes/${fileName}`, { encoding: 'utf8' }));
  amtrakerFeatures.push(...file.features);
});

fs.writeFileSync('./all.geojson', JSON.stringify({
  "type": "FeatureCollection",
  "features": features,
}))

fs.writeFileSync('./allAmtraker.geojson', JSON.stringify({
  "type": "FeatureCollection",
  "features": amtrakerFeatures,
}))