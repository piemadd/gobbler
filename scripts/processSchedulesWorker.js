const { parentPort, workerData } = require("worker_threads");
const fs = require('fs');
const Papa = require('papaparse');
const findTZ = require('geo-tz').find;
const turf = require('@turf/turf');
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

const daysOfWeek = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const processShapes = (chunk) => {
  chunk.forEach(async (folder) => {
    //if (folder != 'metra') return;
    if (!feedConfigs[folder].generateSchedules) return;
    let agencyTZ = undefined;
    let routes = {};
    let trips = {};
    let services = {};
    let next10DaysOfServices = {};
    let headsignsArr = [];
    let stops = {};

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
                    headsign: trip.trip_headsign ?? "",
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
                      const readStream = fs.createReadStream(`./csv/${folder}/calendar_dates.txt`);

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
                            case '2': //removal
                              services[calendarDate.service_id].removals.push(parseInt(calendarDate.date));
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

                              stops[stop.stop_id] = {
                                name: stop.stop_name,
                                tz: stop.stop_timezone ?? agencyTZ,
                                services: {},
                              };

                              if (!stops[stop.stop_id].tz || stops[stop.stop_id].tz.length == 0) {
                                stops[stop.stop_id].tz = findTZ(stop.stop_lat, stop.stop_lon);
                              }

                              stops[stop.stop_id].tzOffset = getOffset(stops[stop.stop_id].tz)
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

                                  if (!stopTime.arrival_time && !stopTime.departure_time) return;
                                  const timeParsed = (stopTime.departure_time ?? stopTime.arrival_time).split(':').map((n) => parseInt(n));

                                  trips[stopTime.trip_id].times.push({
                                    hour: timeParsed[0],
                                    minute: timeParsed[1],
                                    second: timeParsed[2],
                                    timeNum: parseInt(timeParsed.map((n) => n.toString().padStart(2, "0")).join('')),
                                    stopID: stopTime.stop_id,
                                    sequence: stopTime.stop_sequence,
                                  });

                                  // eh
                                  if (stopTime.stop_headsign && trips[stopTime.trip_id].headsign.length == 0) {
                                    trips[stopTime.trip_id].headsign = stopTime.stop_headsign
                                  }

                                  const trip = trips[stopTime.trip_id];

                                  stops[stopTime.stop_id].services[trip.serviceID].trips.push({
                                    hour: timeParsed[0],
                                    minute: timeParsed[1],
                                    second: timeParsed[2],
                                    timeNum: parseInt(timeParsed.map((n) => n.toString().padStart(2, "0")).join('')),
                                    routeID: trip.routeID,
                                    tripID: feedConfigs[folder].convertTripID ?
                                      feedConfigs[folder].convertTripID(trip.tripID) : trip.tripID,
                                    realTripID: trip.tripID,
                                  })
                                },
                                complete: () => {
                                  try {
                                    // looping through twice because js is stupid and for some reason fucks up here
                                    console.log(`Reprocessing headsigns for ${folder}`)
                                    Object.values(trips).forEach((trip) => {
                                      if (!headsignsArr.includes(trip.headsign)) headsignsArr.push(trip.headsign);
                                    });

                                    // sort it cuz why not
                                    headsignsArr = headsignsArr.sort();

                                    Object.values(trips).forEach((trip) => {
                                      trips[trip.tripID].headsignIndex = headsignsArr.indexOf(trip.headsign);
                                    })

                                    console.log(`Generating actual schedule for ${folder}`)

                                    const now = new Date();
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
                                                secondsDiff
                                              ];

                                              if (i == 0) {
                                                final.push(trips[trip.realTripID].headsignIndex);
                                                final.push(trip.routeID);
                                                return final;
                                              }

                                              //add headsign if not the same
                                              if (trips[trip.realTripID].headsignIndex != trips[arr[i - 1].realTripID].headsignIndex) {
                                                final.push(trips[trip.realTripID].headsignIndex);
                                              }

                                              //add route ID if not the same
                                              if (trip.routeID != arr[i - 1].routeID) {
                                                if (final.length < 2) final.push(-1); // need to keep array order
                                                final.push(trip.routeID);
                                              }

                                              return final;
                                            })
                                      })
                                    });

                                    console.log(`Saving files for ${folder}`)

                                    if (fs.existsSync(`./schedules/${folder}`)) fs.rmSync(`./schedules/${folder}`, { recursive: true, force: true })
                                    fs.mkdirSync(`./schedules/${folder}`);

                                    //headsigns
                                    fs.writeFileSync(
                                      `./schedules/${folder}/headsigns.json`,
                                      JSON.stringify(headsignsArr),
                                      { encoding: 'utf8' }
                                    );

                                    const dateKeys = Object.keys(next10DaysOfServices);

                                    //date keys
                                    fs.writeFileSync(
                                      `./schedules/${folder}/dateKeys.json`,
                                      JSON.stringify(dateKeys),
                                      { encoding: 'utf8' }
                                    );

                                    //dates keys
                                    for (let i = 0; i < dateKeys.length; i++) {
                                      fs.writeFileSync(
                                        `./schedules/${folder}/${dateKeys[i]}.json`,
                                        JSON.stringify(next10DaysOfServices[dateKeys[i]]),
                                        { encoding: 'utf8' }
                                      );
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
  })
}

processShapes(workerData.chunk);