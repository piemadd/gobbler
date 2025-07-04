const protobuf = require('protobufjs');
const fs = require('fs');

run().catch(err => console.log(err));

async function run() {
  const root = await protobuf.load('schedules.proto');

  const ScheduleMessage = root.lookupType('gobbler.ScheduleMessage');
  const MultipleVehiclesScheduleMessage = root.lookupType('gobbler.MultipleVehiclesScheduleMessage');

  const dayBuf = fs.readFileSync('./schedules/metra/2025-07-04.pbf');
  const vehBuf = fs.readFileSync('./schedules/metra/vehicles.pbf');

  const dayObj = ScheduleMessage.decode(dayBuf).toJSON();
  const vehObj = MultipleVehiclesScheduleMessage.decode(vehBuf).toJSON();

  const elburn = dayObj.stopMessage.find((item) => item.stopId == 'ELBURN');

  console.log(elburn)
}