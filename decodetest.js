const protobuf = require('protobufjs');
const fs = require('fs');

run().catch(err => console.log(err));

async function run() {
  const root = await protobuf.load('schedules.proto');

  const User = root.lookupType('gobbler.MultipleVehiclesScheduleMessage');

  const buf = fs.readFileSync('./schedules/metra/vehicles.pbf');

  const obj = User.decode(buf);

  console.log(obj.vehicleScheduleMessage)
}