const fs = require('fs');
const Papa = require('papaparse');
const findTZ = require('geo-tz').find;
const protobuf = require('protobufjs');
const feedConfigs = require('../feeds.js');

// https://stackoverflow.com/questions/4413590/javascript-get-array-of-dates-between-2-dates
const getDaysArray = (start, end) => {
  const arr = [];
  for (const dt = new Date(start); dt <= new Date(end); dt.setUTCDate(dt.getUTCDate() + 1)) {
    const nd = new Date(dt);
    nd.setUTCHours(0);
    nd.setUTCMinutes(0);
    nd.setUTCSeconds(0);
    nd.setUTCMilliseconds(0);
    arr.push(nd);
  }
  return arr;
};

// slightly modified
// https://stackoverflow.com/questions/21327371/get-timezone-offset-from-timezone-name-using-javascript
const getOffset = (timeZone = 'UTC', date = new Date()) => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  const minutesDiff = (tzDate.getTime() - utcDate.getTime()) / 6e4;
  return [0 - Math.floor(minutesDiff / 60), 0 - (minutesDiff % 60)];
}

const convertDayScheduleIntoUsable = (day, folder) => {
  let finalDay = {
    stopMessage: [],
  };

  Object.keys(day).forEach((stopKey) => {
    const stop = day[stopKey];
    let finalStop = {
      stopId: stopKey, //CHECK THIS ON ERROR
      trainMessage: [],
    };

    stop.forEach((train) => {
      finalStop.trainMessage.push({
        timeDiff: train[0],
        runNumber: feedConfigs[folder].scheduleRunNumbersRequired ? train[1] : null,
        headsignId: train[2] != -1 ? train[2] : null, // CHECK ON ERROR
        routeId: train[3] != -1 ? train[3] : null, // CHECK ON ERROR
      })
    })

    finalDay.stopMessage.push(finalStop);
  });

  return finalDay;
};

const daysOfWeek = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const processSchedules = async (chunk) => {
  for (let i = 0; i < chunk.length; i++) {
    const folder = chunk[i];
    if (!feedConfigs[folder].generateSchedules) continue;
    let agencyTZ = undefined;
    let routes = {};
    let routesArr = [];
    let routesIndex = {};
    let trips = {};
    let services = {};
    let next10DaysOfServices = {};
    let servicesForEachDate = {};
    let headsignsArr = [];
    let headsignsIndex = {};
    let stops = {};
    let parentStops = {};
    let timeBetweenStops = {};
    let stoppingPatterns = {};
    let stoppingPatternArray = [];
    let stoppingPatternKeys = {};

    const root = await protobuf.load('schedules.proto');
    const ScheduleMessage = root.lookupType('gobbler.ScheduleMessage');
    const MultipleVehiclesScheduleMessage = root.lookupType('gobbler.MultipleVehiclesScheduleMessage');

    try {
      console.log(`Parsing agency for ${folder}`)
      const readStream = fs.createReadStream(`./csv/${folder}/agency.txt`);

      Papa.parse(readStream, {
        //delimiter: ',',
        header: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
        step: async (row) => {
          const agency = row.data;

          agencyTZ = agency.agency_timezone;
        },
        complete: () => {
          console.log(`Parsing routes for ${folder}`)
          const readStream = fs.createReadStream(`./csv/${folder}/routes.txt`);

          Papa.parse(readStream, {
            //delimiter: ',',
            header: true,
            transformHeader: (h) => h.trim(),
            transform: (v) => v.trim(),
            step: async (row) => {
              const route = row.data;

              routes[route.route_id] = {
                sName: route.route_short_name,
                lName: route.route_long_name,
                type: route.route_type,
                color: route.route_color, //routeColor on legacy shapes
              }
            },
            complete: () => {
              console.log(`Reprocessing routes for ${folder}`);

              routesArr = Object.keys(routes);

              routesArr.forEach((routeID, i) => {
                routesIndex[routeID] = i;
              })

              console.log(`Parsing trips for ${folder}`)
              const readStream = fs.createReadStream(`./csv/${folder}/trips.txt`);

              Papa.parse(readStream, {
                //delimiter: ',',
                header: true,
                transformHeader: (h) => h.trim(),
                transform: (v) => v.trim(),
                step: async (row) => {
                  const trip = row.data;

                  trips[trip.trip_id] = {
                    tripID: trip.trip_id,
                    routeID: trip.route_id,
                    serviceID: trip.service_id,
                    times: [],
                    headsign: trip.trip_headsign,
                    headsignIndex: -1,
                  }
                },
                complete: () => {
                  console.log(`Parsing calendar for ${folder}`)
                  const readStream = fs.createReadStream(`./csv/${folder}/calendar.txt`);

                  Papa.parse(readStream, {
                    //delimiter: ',',
                    header: true,
                    transformHeader: (h) => h.trim(),
                    transform: (v) => v.trim(),
                    step: async (row) => {
                      const calendar = row.data;

                      services[calendar.service_id] = {
                        serviceID: calendar.service_id,
                        startDate: parseInt(calendar.start_date),
                        endDate: parseInt(calendar.end_date),
                        monday: calendar.monday == '1' ? true : false,
                        tuesday: calendar.tuesday == '1' ? true : false,
                        wednesday: calendar.wednesday == '1' ? true : false,
                        thursday: calendar.thursday == '1' ? true : false,
                        friday: calendar.friday == '1' ? true : false,
                        saturday: calendar.saturday == '1' ? true : false,
                        sunday: calendar.sunday == '1' ? true : false,
                        additions: [],
                        removals: [],
                      };
                    },
                    complete: () => {
                      console.log(`Parsing calendar_dates for ${folder}`)
                      const readStream = fs.existsSync(`./csv/${folder}/calendar_dates.txt`) ?
                        fs.createReadStream(`./csv/${folder}/calendar_dates.txt`) :
                        fs.createReadStream(`./dummyEmptyFile.txt`);

                      Papa.parse(readStream, {
                        //delimiter: ',',
                        header: true,
                        transformHeader: (h) => h.trim(),
                        transform: (v) => v.trim(),
                        step: async (row) => {
                          const calendarDate = row.data;

                          switch (calendarDate.exception_type) {
                            case '1': //addition
                              services[calendarDate.service_id].additions.push(parseInt(calendarDate.date));
                              break;
                            case '2': //removal
                              services[calendarDate.service_id].removals.push(parseInt(calendarDate.date));
                              break;
                          }
                        },
                        complete: () => {
                          console.log(`Parsing stops for ${folder}`)
                          const readStream = fs.createReadStream(`./csv/${folder}/stops.txt`);

                          Papa.parse(readStream, {
                            //delimiter: ',',
                            header: true,
                            transformHeader: (h) => h.trim(),
                            transform: (v) => v.trim(),
                            step: async (row) => {
                              const stop = row.data;

                              if (stop.parent_station && stop.parent_station.length > 0) {
                                parentStops[stop.stop_id] = stop.parent_station
                              } else {

                                stops[stop.stop_id] = {
                                  name: stop.stop_name,
                                  tz: stop.stop_timezone ?? agencyTZ,
                                  services: {},
                                };

                                if (!stops[stop.stop_id].tz || stops[stop.stop_id].tz.length == 0) {
                                  stops[stop.stop_id].tz = findTZ(stop.stop_lat, stop.stop_lon);
                                }

                                stops[stop.stop_id].tzOffset = getOffset(stops[stop.stop_id].tz)
                              }
                            },
                            complete: () => {
                              console.log(`Adding services to stops for ${folder}`)
                              const allServiceIDs = Object.keys(services);

                              Object.keys(stops).forEach((stopID) => {
                                allServiceIDs.forEach((serviceID) => {
                                  stops[stopID].services[serviceID] = { trips: [] };
                                })
                              })

                              console.log(`Parsing stop_times for ${folder}`)
                              const readStream = fs.createReadStream(`./csv/${folder}/stop_times.txt`);

                              Papa.parse(readStream, {
                                //delimiter: ',',
                                header: true,
                                transformHeader: (h) => h.trim(),
                                transform: (v) => v.trim(),
                                step: async (row) => {
                                  const stopTime = row.data;
                                  const stopID = parentStops[stopTime.stop_id] ?? stopTime.stop_id;

                                  if (!stopTime.arrival_time && !stopTime.departure_time) return;
                                  const timeParsed = (stopTime.departure_time ?? stopTime.arrival_time).split(':').map((n) => parseInt(n));

                                  trips[stopTime.trip_id].times.push({
                                    hour: timeParsed[0],
                                    minute: timeParsed[1],
                                    second: timeParsed[2],
                                    timeNum: parseInt(timeParsed.map((n) => n.toString().padStart(2, "0")).join('')),
                                    stopID: stopID,
                                    sequence: stopTime.stop_sequence,
                                  });

                                  const trip = trips[stopTime.trip_id];

                                  const headsign = stopTime.stop_headsign && stopTime.stop_headsign.length > 0 ? stopTime.stop_headsign : (trips[stopTime.trip_id].headsign ?? "");

                                  stops[stopID].services[trip.serviceID].trips.push({
                                    hour: timeParsed[0],
                                    minute: timeParsed[1],
                                    second: timeParsed[2],
                                    timeNum: parseInt(timeParsed.map((n) => n.toString().padStart(2, "0")).join('')),
                                    routeID: trip.routeID,
                                    tripID: feedConfigs[folder].convertTripID ?
                                      feedConfigs[folder].convertTripID(trip.tripID) : trip.tripID,
                                    headsign: headsign,
                                  })

                                  headsignsIndex[headsign] = 1; // trust the process here
                                },
                                complete: () => {
                                  console.log(`Done parsing CSV for ${folder}`)
                                  let compressedTripsRaw = [];

                                  let tripsArray = Object.values(trips);
                                  trips = null;//RAM SAVING

                                  for (let i = 0; i < tripsArray.length; i++) {
                                    const trip = tripsArray[i];
                                    const today = new Date();
                                    today.setUTCHours(0);
                                    today.setUTCMinutes(0);
                                    today.setUTCSeconds(0);
                                    let lastTimeStamp = parseInt(Math.floor(today.valueOf() / 1000));
                                    let startTimeStamp = 0;

                                    const finalTrip = {
                                      runNumber: trip.tripID,
                                      routeId: trip.routeID,
                                      serviceId: trip.serviceID,
                                      vehicleStop: trip.times
                                        .sort((a, b) => a.timeNum - b.timeNum)
                                        .map((time, i, arr) => {
                                          const stop = stops[time.stopID];
                                          const todayClone = new Date(today);
                                          todayClone.setUTCHours(time.hour + stop.tzOffset[0]);
                                          todayClone.setUTCMinutes(time.minute + stop.tzOffset[1]);
                                          todayClone.setUTCSeconds(time.second);
                                          const todayCloneSeconds = Math.floor(todayClone.valueOf() / 1000);
                                          const secondsDiff = todayCloneSeconds - lastTimeStamp;
                                          lastTimeStamp = todayCloneSeconds;

                                          if (i == 0) {
                                            startTimeStamp = (Math.floor(todayClone.valueOf() / 1000)) - (Math.floor(today.valueOf() / 1000));
                                          }

                                          if (i > 0) {
                                            const lastStopID = arr[i - 1]['stopID'];

                                            if (!timeBetweenStops[`${lastStopID}_${time.stopID}`] || timeBetweenStops[`${lastStopID}_${time.stopID}`] > secondsDiff) {
                                              timeBetweenStops[`${lastStopID}_${time.stopID}`] = secondsDiff;
                                            };
                                          };

                                          return time.stopID
                                        })
                                    };

                                    finalTrip['startTime'] = startTimeStamp;
                                    compressedTripsRaw.push(finalTrip)
                                  }

                                  tripsArray = null;

                                  compressedTripsRaw.forEach((trip) => {
                                    const tripStoppingPattern = trip.vehicleStop.join('-');
                                    if (!stoppingPatterns[tripStoppingPattern]) {
                                      stoppingPatterns[tripStoppingPattern] = trip.vehicleStop;
                                    }
                                  })

                                  stoppingPatternArray = Object.keys(stoppingPatterns).sort();
                                  stoppingPatternArray.forEach((stoppingPatternKey, i) => {
                                    stoppingPatternKeys[stoppingPatternKey] = i;
                                  })

                                  compressedTripsRaw = compressedTripsRaw.map((trip) => {
                                    const tripStoppingPattern = trip.vehicleStop.join('-');
                                    return {
                                      ...trip,
                                      vehicleStop: stoppingPatternKeys[tripStoppingPattern],
                                    }
                                  })

                                  try {
                                    let compressedTripsProtoMessage = MultipleVehiclesScheduleMessage.fromObject({ vehicleScheduleMessage: compressedTripsRaw });
                                    compressedTripsRaw = null;
                                    let compressedTripsBufProto = MultipleVehiclesScheduleMessage.encode(compressedTripsProtoMessage).finish();
                                    compressedTripsProtoMessage = null;

                                    if (fs.existsSync(`./schedules/${folder}`)) fs.rmSync(`./schedules/${folder}`, { recursive: true, force: true })
                                    fs.mkdirSync(`./schedules/${folder}`);

                                    fs.writeFileSync(
                                      `./schedules/${folder}/vehicles.pbf`,
                                      compressedTripsBufProto
                                    );
                                    console.log(`Done with ./schedules/${folder}/vehicles.pbf`);

                                    compressedTripsBufProto = null;
                                  } catch (e) {
                                    console.log(e)
                                  }

                                  try {
                                    // looping through twice because js is stupid and for some reason fucks up here
                                    console.log(`Reprocessing headsigns for ${folder}`)
                                    headsignsArr = Object.keys(headsignsIndex).sort();

                                    headsignsArr.forEach((headsign, i) => {
                                      headsignsIndex[headsign] = i;
                                    })

                                    console.log(`Generating actual schedule for ${folder}`)

                                    const now = new Date(Date.now() - (1000 * 60 * 60 * 24)); // yesterday
                                    const in10Days = new Date(now.valueOf() + (1000 * 60 * 60 * 24 * 10));
                                    const dates = getDaysArray(now, in10Days);

                                    dates.forEach((today) => {
                                      const todayKey = today.toISOString().split('T')[0];
                                      const todayNum = parseInt(todayKey.replaceAll('-', ''));
                                      const todayDayOfWeek = daysOfWeek[today.getDay()];
                                      const todayStart = Math.floor(today.valueOf() / 1000);

                                      const validServices = Object.values(services).filter((service) => {
                                        if (service.removals.includes(todayNum)) return false;
                                        if (todayNum <= service.endDate && todayNum >= service.startDate) return true;
                                        if (service.additions.includes(todayNum)) return true;
                                        return false;
                                      }).filter((service) => service[todayDayOfWeek]).map((service) => service.serviceID);

                                      servicesForEachDate[todayKey] = validServices;

                                      next10DaysOfServices[todayKey] = {};

                                      Object.keys(stops).forEach((stopID) => {
                                        const stop = stops[stopID];

                                        next10DaysOfServices[todayKey][stopID] = [];

                                        validServices.forEach((validService) => {
                                          next10DaysOfServices[todayKey][stopID].push(
                                            ...stop.services[validService].trips
                                          );
                                        })

                                        let lastTimeStamp = parseInt(todayStart);

                                        next10DaysOfServices[todayKey][stopID] =
                                          next10DaysOfServices[todayKey][stopID]
                                            .sort((aTrip, bTrip) => aTrip.timeNum - bTrip.timeNum)
                                            .map((trip, i, arr) => {
                                              const todayClone = new Date(today);
                                              todayClone.setUTCHours(trip.hour + stop.tzOffset[0]);
                                              todayClone.setUTCMinutes(trip.minute + stop.tzOffset[1]);
                                              todayClone.setUTCSeconds(trip.second);
                                              const todayCloneSeconds = Math.floor(todayClone.valueOf() / 1000);

                                              const secondsDiff = todayCloneSeconds - lastTimeStamp;
                                              lastTimeStamp = todayCloneSeconds;

                                              let final = [
                                                secondsDiff,
                                                trip.tripID,
                                              ];

                                              if (i == 0) {
                                                final.push(headsignsIndex[trip.headsign]);
                                                final.push(routesIndex[trip.routeID]);
                                                return final;
                                              }

                                              //add headsign if not the same
                                              if (trip.headsign != arr[i - 1].headsign) {
                                                final.push(headsignsIndex[trip.headsign]);
                                              } else final.push(-1);

                                              //add route ID if not the same
                                              if (trip.routeID != arr[i - 1].routeID) {
                                                final.push(routesIndex[trip.routeID]);
                                              } else final.push(-1);

                                              return final;
                                            })
                                      })
                                    });

                                    console.log(`Saving files for ${folder}`)

                                    //metadata
                                    fs.writeFileSync(
                                      `./schedules/${folder}/metadata.json`,
                                      JSON.stringify({
                                        headsigns: headsignsArr,
                                        routes: routesArr,
                                        services: servicesForEachDate,
                                        stoppingPatterns: stoppingPatternArray.map((stoppingPatternKey) => stoppingPatterns[stoppingPatternKey]),
                                        stopTimes: timeBetweenStops,
                                      }),
                                      { encoding: 'utf8' }
                                    );
                                    console.log(`Done with ./schedules/${folder}/metadata.json`)

                                    const dateKeys = Object.keys(next10DaysOfServices);

                                    //date keys
                                    fs.writeFileSync(
                                      `./schedules/${folder}/dateKeys.json`,
                                      JSON.stringify(dateKeys),
                                      { encoding: 'utf8' }
                                    );
                                    console.log(`Done with ./schedules/${folder}/dateKeys.json`)

                                    /*
                                    console.log('agencyTZ', JSON.stringify(agencyTZ).length);
                                    console.log('routes', JSON.stringify(routes).length);
                                    console.log('routesArr', JSON.stringify(routesArr).length);
                                    console.log('routesIndex', JSON.stringify(routesIndex).length);
                                    console.log('trips', JSON.stringify(trips).length);
                                    console.log('services', JSON.stringify(services).length);
                                    console.log('next10DaysOfServices', JSON.stringify(next10DaysOfServices).length);
                                    console.log('headsignsArr', JSON.stringify(headsignsArr).length);
                                    console.log('headsignsIndex', JSON.stringify(headsignsIndex).length);
                                    console.log('parentStops', JSON.stringify(parentStops).length);
                                    */

                                    //dates keys
                                    for (let i = 0; i < dateKeys.length; i++) {
                                      let convertedDay = convertDayScheduleIntoUsable(next10DaysOfServices[dateKeys[i]], folder);
                                      next10DaysOfServices[dateKeys[i]] = null; // reduing ram usage, possibly

                                      let protoMessage = ScheduleMessage.fromObject(convertedDay);
                                      convertedDay = null; // reducing ram usage, possibly
                                      let bufProto = ScheduleMessage.encode(protoMessage).finish();
                                      protoMessage = null; // reducing ram usage, possibly

                                      fs.writeFileSync(
                                        `./schedules/${folder}/${dateKeys[i]}.pbf`,
                                        bufProto
                                      );
                                      console.log(`Done with ./schedules/${folder}/${dateKeys[i]}.pbf`)
                                    }

                                    console.log(`Done with schedules for ${folder}`)
                                  } catch (e) {
                                    console.error(e)
                                  }
                                }
                              })
                            }
                          })
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      });

    } catch (e) {
      console.log(`Error parsing csv for ${folder}`)
    }
  }
}

//processSchedules(workerData.chunk);

module.exports.processSchedules = processSchedules;