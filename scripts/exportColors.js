const fs = require('fs');

const shapeFiles = fs.readdirSync('./shapes');

let allColors = [];

shapeFiles.forEach((shapeFile) => {
  const data = JSON.parse(fs.readFileSync(`./shapes/${shapeFile}`, 'utf8'));

  data.features.forEach((feature) => {
    const color = feature.properties.routeColor.replace('#', '');

    if (!allColors.includes(color)) allColors.push(color);
  })
})

fs.writeFileSync('./gtfsColors.json', JSON.stringify(allColors.map((x) => `${x}_000000`)));