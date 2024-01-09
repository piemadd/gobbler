const fs = require('fs');

const shapesToCombine = fs.readdirSync('./shapes');

let features = [];

shapesToCombine.forEach((fileName) => {
  const file = JSON.parse(fs.readFileSync(`./shapes/${fileName}`, { encoding: 'utf8' }));
  features.push(...file.features);
})

fs.writeFileSync('./all.geojson', JSON.stringify({
  "type": "FeatureCollection",
  "features": features,
}))