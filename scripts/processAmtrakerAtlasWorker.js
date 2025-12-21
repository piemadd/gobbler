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

const processAtlasData = async (chunk) => {
  for (let i = 0; i < chunk.length; i++) {
    const folder = chunk[i];

    if (folder != 'amtrak') continue; // FOR DEBUG

    if (!feedConfigs[folder].generateAtlasData) continue;
    console.log('Generating atlas data for', folder)
    let agencyTZ = undefined;
    let routes = {};
    let routesArr = [];
    let routesIndex = {};
    let trips = {};
    let services = {};
    let headsignsIndex = {};
    let stops = {};
    let parentStops = {};
    let routeIDReplacements = {};
    let shortTripIDs = {};

    let feedPath = `./csv/${folder}`;
    if (feedConfigs[folder].subfolder) {
      feedPath = `./csv/${folder}/${feedConfigs[folder].subfolder}`
    }

    try {
      console.log(`Parsing agency for ${folder}`)
      const readStream = fs.createReadStream(`${feedPath}/agency.txt`);

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
          const readStream = fs.createReadStream(`${feedPath}/routes.txt`);

          Papa.parse(readStream, {
            //delimiter: ',',
            header: true,
            transformHeader: (h) => h.trim(),
            transform: (v) => v.trim(),
            step: async (row) => {
              const route = row.data;

              if (feedConfigs[folder]['useRouteShortNameForID']) {
                routeIDReplacements[route.route_id] = route.route_short_name;
                route.route_id = route.route_short_name;
              };

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
              const readStream = fs.createReadStream(`${feedPath}/trips.txt`);

              Papa.parse(readStream, {
                //delimiter: ',',
                header: true,
                transformHeader: (h) => h.trim(),
                transform: (v) => v.trim(),
                step: async (row) => {
                  const trip = row.data;

                  if (feedConfigs[folder]['useRouteShortNameForID']) trip.route_id = routeIDReplacements[trip.route_id];

                  const useShortNames = trip.trip_short_name && trip.trip_short_name.length > 0;
                  if (useShortNames) shortTripIDs[trip.trip_id] = trip.trip_short_name;

                  trips[useShortNames ? trip.trip_short_name : trip.trip_id] = {
                    tripID: useShortNames ? trip.trip_short_name : trip.trip_id,
                    routeID: trip.route_id,
                    serviceID: trip.service_id,
                    times: [],
                    headsign: trip.trip_headsign,
                  }
                },
                complete: () => {
                  console.log(`Parsing calendar for ${folder}`)
                  const readStream = fs.existsSync(`${feedPath}/calendar.txt`) ?
                    fs.createReadStream(`${feedPath}/calendar.txt`) :
                    fs.createReadStream(`./dummyEmptyFile.txt`);

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
                      const readStream = fs.existsSync(`${feedPath}/calendar_dates.txt`) ?
                        fs.createReadStream(`${feedPath}/calendar_dates.txt`) :
                        fs.createReadStream(`./dummyEmptyFile.txt`);

                      Papa.parse(readStream, {
                        //delimiter: ',',
                        header: true,
                        transformHeader: (h) => h.trim(),
                        transform: (v) => v.trim(),
                        step: async (row) => {
                          const calendarDate = row.data;


                          if (!services[calendarDate.service_id]) {
                            const weekAgo = new Date(Date.now() - (1000 * 60 * 60 * 24 * 7));
                            const weekAhead = new Date(Date.now() + (1000 * 60 * 60 * 24 * 7));

                            services[calendarDate.service_id] = {
                              serviceID: calendarDate.service_id,
                              startDate: parseInt(`${weekAgo.getFullYear()}0101`),
                              endDate: parseInt(`${weekAhead.getFullYear()}1231`),
                              monday: false,
                              tuesday: false,
                              wednesday: false,
                              thursday: false,
                              friday: false,
                              saturday: false,
                              sunday: false,
                              additions: [],
                              removals: [],
                            }
                          }

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
                          const readStream = fs.createReadStream(`${feedPath}/stops.txt`);

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
                              const readStream = fs.createReadStream(`${feedPath}/stop_times.txt`);

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

                                  trips[shortTripIDs[stopTime.trip_id] ?? stopTime.trip_id].times.push({
                                    hour: timeParsed[0],
                                    minute: timeParsed[1],
                                    second: timeParsed[2],
                                    timeNum: parseInt(timeParsed.map((n) => n.toString().padStart(2, "0")).join('')),
                                    stopID: stopID,
                                    sequence: stopTime.stop_sequence,
                                  });
                                },
                                complete: () => {
                                  console.log('Reprocessing stop times');
                                  Object.values(trips).forEach((trip) => {
                                    trips[trip.tripID].times = trips[trip.tripID].times
                                    .sort((a, b) => a.sequence - b.sequence)
                                    .map((time, timeIndex, arr) => {
                                      if (timeIndex == 0) {
                                        return {
                                          ...time,
                                          diff: 0,
                                        }
                                      } else {
                                        return {
                                          ...time,
                                          diff:
                                            ((time.hour * 360) + (time.minute * 60) + time.second) -
                                            ((arr[timeIndex - 1].hour * 360) + (arr[timeIndex - 1].minute * 60) + arr[timeIndex - 1].second)
                                        }
                                      }
                                    })
                                  });

                                  console.log(`Done parsing CSV for ${folder}`)

                                  fs.writeFileSync('./trips.json', JSON.stringify(trips, null, 2), { encoding: 'utf8' });
                                  fs.writeFileSync('./routes.json', JSON.stringify(routes, null, 2), { encoding: 'utf8' });
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

//processAtlasData(workerData.chunk);

module.exports.processAtlasData = processAtlasData;