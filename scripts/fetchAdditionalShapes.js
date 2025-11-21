const fs = require('fs');
//const passio = require('../additionalShapes/passio.json');
const amtrak = require('../additionalShapes/amtrak.json');
const amtrak_capitol_corridor = require('../additionalShapes/amtrak_capitol_corridor.json');
const amtrak_cascades = require('../additionalShapes/amtrak_cascades.json');
const amtrak_mardi_gras = require('../additionalShapes/amtrak_mardi_gras.json');
const snowPiercer = require('../additionalShapes/snowPiercer.json');
const mff = require('../additionalShapes/mff.json');
const cpkcHoliday = require('../additionalShapes/cpkcHoliday.json');

/*
(async () => {
  for (let i = 0; i < passio.length; i++) {
    const agency = passio[i];
    const agencyData = await fetch(`https://passio.piemadd.com/data/${agency}`).then((res) => res.json());
    const agencyKey = agency.split('/')[0];
    fs.writeFileSync(`./shapes/${agencyKey}.json`, JSON.stringify(agencyData), { encoding: 'utf8' });
    console.log(`Fetched ${agencyKey}`);
  }
})();
*/

fs.writeFileSync('./shapes/nationalRoute.json', JSON.stringify(amtrak), { encoding: 'utf8' });
fs.writeFileSync('./shapes/amtrak_capitol_corridor.json', JSON.stringify(amtrak_capitol_corridor), { encoding: 'utf8' });
fs.writeFileSync('./shapes/amtrak_cascades.json', JSON.stringify(amtrak_cascades), { encoding: 'utf8' });
fs.writeFileSync('./shapes/amtrak_mardi_gras.json', JSON.stringify(amtrak_mardi_gras), { encoding: 'utf8' });
fs.writeFileSync('./shapes/snowPiercer.json', JSON.stringify(snowPiercer), { encoding: 'utf8' });
fs.writeFileSync('./shapes/mff.json', JSON.stringify(mff), { encoding: 'utf8' });
fs.writeFileSync('./shapes/cpkcHoliday.json', JSON.stringify(cpkcHoliday), { encoding: 'utf8' });