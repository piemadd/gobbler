const { parentPort, workerData } = require("worker_threads");
const fs = require('fs');
const Papa = require('papaparse');
const findTZ = require('geo-tz').find;
const turf = require('@turf/turf');

const additionalConfig = workerData.feedConfigs;

const processShapes = (chunk) => {
  chunk.forEach(async (folder) => {
    let agencyTZ = undefined;
    let timeZones = {};
    let routes = {};
    let trips = {};
    let services = {};
    let serviceAdditions = {};
    let next30DaysOfServices = {};
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
                    routeID: trip.route_id,
                    serviceID: trip.service_id,
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
                        startDate: calendar.start_date,
                        endDate: calendar.end_date,
                        monday: calendar.monday,
                        tuesday: calendar.tuesday,
                        wednesday: calendar.wednesday,
                        thursday: calendar.thursday,
                        friday: calendar.friday,
                        saturday: calendar.saturday,
                        sunday: calendar.sunday,
                        exceptions: [],
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
                              if (!serviceAdditions[calendarDate.date]) serviceAdditions[calendarDate.date] = [];
                              serviceAdditions[calendarDate.date].push(calendarDate.service_id);
                            case '2': //removal
                              services[calendarDate.service_id].exceptions.push(calendarDate.date);
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
                                tz: stop.stop_timezone ?? agencyTZ,
                                services: {},
                              };

                              if (!stops[stop.stop_id].services || stops[stop.stop_id].length == 0) {
                                stops[stop.stop_id] = findTZ(stop.stop_lat, stop.stop_lon);
                              }
                            },
                            complete: () => {
                              console.log(`Adding services to stops for ${folder}`)
                              const allServiceIDs = Object.keys(services);
                              Object.keys(stops).forEach((stopID) => {
                                stops[stopID].services
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

                                  //console.log(stopTime)

                                  //console.log(row.data)
                                },
                                complete: () => {
                                  console.log(`Sorting/processing shapes for ${folder}`)

                                  fs.mkdirSync(`./schedules/${folder}`);
                                  /*
                                  fs.writeFile(`./shapes/${folder}.geojson`, JSON.stringify(featureCollection), { encoding: 'utf8' }, () => {
                                    console.log(`Done with ${folder}`);
                                  })
                                  */
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