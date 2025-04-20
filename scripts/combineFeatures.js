const fs = require('fs');

const shapesToCombine = fs.readdirSync('./shapes');
const amtrakerFileNames = [
  'via_rail.geojson',
  'nationalRoute.json',
  'brightline.geojson',
  'amtrak_capitol_corridor.json',
  'amtrak_cascades.json'
];

let features = [];
let amtrakerFeatures = [];

for (let i = 0; i < shapesToCombine.length; i++) {
  const fileName = shapesToCombine[i];
  const file = JSON.parse(fs.readFileSync(`./shapes/${fileName}`, { encoding: 'utf8' }));
  features.push(...file.features);
};

for (let i = 0; i < amtrakerFileNames.length; i++) {
  const fileName = amtrakerFileNames[i];
  const file = JSON.parse(fs.readFileSync(`./shapes/${fileName}`, { encoding: 'utf8' }));
  amtrakerFeatures.push(...file.features);
};

fs.writeFileSync('./all.geojson', JSON.stringify({
  "type": "FeatureCollection",
  "features": features,
}))

fs.writeFileSync('./allAmtraker.geojson', JSON.stringify({
  "type": "FeatureCollection",
  "features": amtrakerFeatures,
}))