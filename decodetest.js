const protobuf = require('protobufjs');
const fs = require('fs');

run().catch(err => console.log(err));

async function run() {
  const root = await protobuf.load('schedules.proto');

  const Message = root.lookupType('gobbler.ScheduleMessage');

  const buf = fs.readFileSync('./schedules/metra/2025-03-15.pbf');

  const obj = Message.decode(buf);

  const elburn = obj.toJSON().stopMessage.find((item) => item.stopId == 'ELBURN');

  console.log(elburn)
}