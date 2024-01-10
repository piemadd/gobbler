const fs = require('fs');
const passio = require('../additionalShapes/passio.json');
const amtrak = require('../additionalShapes/amtrak.json');

passio.forEach((agency) => {
  fetch(`https://passio.piemadd.com/data/${agency}`)
    .then((res) => res.json())
    .then((data) => {
      const agencyKey = agency.split('/')[0];

      fs.writeFileSync(`./shapes/${agencyKey}.json`, JSON.stringify(data), { encoding: 'utf8' });
      console.log(`Fetched ${agencyKey}`)
    })
})

fs.writeFileSync('./shapes/nationalRoute.json', JSON.stringify(amtrak), { encoding: 'utf8' });