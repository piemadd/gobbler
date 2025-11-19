const protobuf = require('protobufjs');
const fs = require('fs');

run().catch(err => console.log(err));

async function run() {
  const root = await protobuf.load('schedules.proto');

  const ScheduleMessage = root.lookupType('gobbler.ScheduleMessage');
  const MultipleVehiclesScheduleMessage = root.lookupType('gobbler.MultipleVehiclesScheduleMessage');

  //const dayBuf = fs.readFileSync('./schedules/metra/2025-07-04.pbf');
  const vehBuf = fs.readFileSync('./schedules/mnrr/vehicles.pbf');

  //const dayObj = ScheduleMessage.decode(dayBuf).toJSON();
  const vehObj = MultipleVehiclesScheduleMessage.decode(vehBuf).toJSON();

  console.log(vehObj)
}