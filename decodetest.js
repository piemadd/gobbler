const protobuf = require('protobufjs');
const fs = require('fs');

run().catch(err => console.log(err));

async function run() {
  const root = await protobuf.load('schedules.proto');

  const User = root.lookupType('gobbler.ScheduleMessage');

  const buf = fs.readFileSync('./schedules/cta/2025-01-09.pbf');

  const obj = User.decode(buf);

  obj.stopMessage.forEach((stopMessage) => {
    console.log(stopMessage)
  })
}