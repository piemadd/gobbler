const { parentPort, workerData } = require("worker_threads");
const fs = require('fs');
const Papa = require('papaparse');
const turf = require('@turf/turf');
const feedConfigs = require('../feeds.js');

const processShapes = (chunk) => {
  chunk.forEach(async (folder) => {
    let routes = {};
    let shapes = {};
    let shapeIdToRouteId = {};
    let featureCollection = {
      "type": "FeatureCollection",
      "features": [],
    };
    let routeIDReplacements = {};

    let doAllShapes = false;
    if (feedConfigs[folder].disabledShapes) return; // we aren't generating shapes
    if (feedConfigs[folder].doAllShapes) doAllShapes = true;

    console.log(folder, doAllShapes)

    try {
      console.log(`Parsing routes for ${folder}`)
      const readStream = fs.createReadStream(`./csv/${folder}/routes.txt`);

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
          console.log(`Parsing trips for ${folder}`)
          const readStream = fs.createReadStream(`./csv/${folder}/trips.txt`);

          Papa.parse(readStream, {
            //delimiter: ',',
            header: true,
            transformHeader: (h) => h.trim(),
            transform: (v) => v.trim(),
            step: async (row) => {
              const trip = row.data;

              if (feedConfigs[folder]['useRouteShortNameForID']) trip.route_id = routeIDReplacements[trip.route_id];

              shapeIdToRouteId[trip.shape_id] = trip.route_id;
            },
            complete: () => {
              console.log(`Parsing shapes for ${folder}`)
              const readStream = fs.createReadStream(`./csv/${folder}/shapes.txt`);

              Papa.parse(readStream, {
                //delimiter: ',',
                header: true,
                transformHeader: (h) => h.trim(),
                transform: (v) => v.trim(),
                step: async (row) => {
                  if (!shapeIdToRouteId[row.data.shape_id] && !doAllShapes) return; //this shape is unused

                  if (!shapes[row.data.shape_id]) shapes[row.data.shape_id] = [];

                  shapes[row.data.shape_id].push([Number(row.data.shape_pt_lon), Number(row.data.shape_pt_lat), Number(row.data.shape_pt_sequence)]);
                },
                complete: () => {
                  console.log(`Sorting/processing shapes for ${folder}`)

                  Object.keys(shapes).forEach(async (shapeID) => {
                    let shape = {
                      "type": "Feature",
                      "properties": {
                        routeColor: '000000',
                        routeType: '0',
                        provider: folder
                      },
                      "geometry": {
                        "coordinates": shapes[shapeID].sort((a, b) => a[2] - b[2]).map((row) => [row[0], row[1]]),
                        "type": "LineString"
                      }
                    }

                    if (shape.geometry.coordinates.length < 2) return; //invalid shape, yeet it

                    if (routes[shapeIdToRouteId[shapeID]]) { //if there is additional data
                      shape.properties.routeColor = routes[shapeIdToRouteId[shapeID]].color ?? shape.properties.routeColor
                      shape.properties.routeType = routes[shapeIdToRouteId[shapeID]].type ?? shape.properties.routeType
                    }

                    //only adding shapes we are using
                    if (!feedConfigs[folder].activeTypes.includes(shape.properties.routeType)) return;

                    if (feedConfigs[folder].colorReplacements) { //if we need to replace colors
                      shape.properties.routeColor = feedConfigs[folder].colorReplacements[shape.properties.routeColor] ?? shape.properties.routeColor
                    }

                    //adding # to color
                    shape.properties.routeColor = `#${shape.properties.routeColor}`;

                    try {
                      const cleanedCoords = turf.cleanCoords(shape, { mutate: true });
                      //const simplified = turf.simplify(cleanedCoords, { tolerance: 0.00001, highQuality: true, mutate: true });

                      featureCollection.features.push(cleanedCoords);
                    } catch (e) {
                      console.log(`THIS ONE RIGHT HERE THIS ONE ${folder} ${shapeID}`)
                    }
                  })

                  fs.writeFile(`./shapes/${folder}.geojson`, JSON.stringify(featureCollection), { encoding: 'utf8' }, () => {
                    console.log(`Done with ${folder}`);
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