const feeds = {
  amtrak: {
    name: "Amtrak",
    url: "https://content.amtrak.com/content/gtfs/GTFS.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: true,
    generateSchedules: true,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {
      "CAE4F1": "5366c9",
      "000000": "5366c9"
    },
    disabled: true,
    activeTypes: [
      "2"
    ]
  },
  via_rail: {
    name: "VIA Rail",
    url: "https://www.viarail.ca/sites/all/files/gtfs/viarail.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: true,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: [
      "2"
    ]
  },
  brightline: {
    name: "Brightline",
    url: "http://feed.gobrightline.com/bl_gtfs.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: true,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: [
      "2"
    ]
  },
  flixbus_us: {
    name: "Flixbus US",
    url: "https://gtfs.gis.flix.tech/gtfs_generic_us.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: true,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: [
      "3"
    ]
  },
  pace: {
    name: "Pace Bus",
    url: "https://www.pacebus.com/sites/default/files/2023-11/GTFS.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: true,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  bart: {
    name: "BART",
    url: "https://www.bart.gov/dev/schedules/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: true,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    activeTypes: ['0', '1']
  },
  RG: {
    name: "Regional GTFS",
    url: "https://api.511.org/transit/datafeeds?api_key=env.bay_511&operator_id=RG",
    headers: {},
    urlEnv: [
      "env.bay_511"
    ],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5"
    ]
  },
  metra: {
    name: "Metra",
    url: "https://gtfsapi.metrarail.com/gtfs/raw/schedule.zip",
    headers: {
      Authorization: "env.metra_authorization"
    },
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: true,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: [
      "2"
    ],
    convertTripID: ((id) => {
      const arr = id.split('_');

      return arr[0].replaceAll('-', '') + '-' + arr[1].match(/(\d+)/)[0];
    }),
  },
  nyct_subway: {
    name: "NYC Subway",
    url: "http://web.mta.info/developers/data/nyct/subway/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  lirr: {
    name: "Long Island Railroad (MTA)",
    url: "http://web.mta.info/developers/data/lirr/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: true,
    activeTypes: []
  },
  mnrr: {
    name: "Metro North (MTA)",
    url: "http://web.mta.info/developers/data/mnr/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  nyct_bronx: {
    name: "NYC Bronx Buses",
    url: "http://web.mta.info/developers/data/nyct/bus/google_transit_bronx.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  nyct_brooklyn: {
    name: "NYC Brooklyn Buses",
    url: "http://web.mta.info/developers/data/nyct/bus/google_transit_brooklyn.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  nyct_manhattan: {
    name: "NYC Manhattan Buses",
    url: "http://web.mta.info/developers/data/nyct/bus/google_transit_manhattan.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  nyct_queens: {
    name: "NYC Queens Buses",
    url: "http://web.mta.info/developers/data/nyct/bus/google_transit_queens.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  nyct_staten_island: {
    name: "NYC Staten Island Buses",
    url: "http://web.mta.info/developers/data/nyct/bus/google_transit_staten_island.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  nyct_mta_bus_company: {
    name: "NYC MTA Bus Company",
    url: "http://web.mta.info/developers/data/busco/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  cta: {
    name: "Chicago Transit Authority",
    url: "https://www.transitchicago.com/downloads/sch_data/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: true,
    scheduleRunNumbersRequired: false,
    colorOverrides: {},
    colorReplacements: {
      "565a5c": "949ca1"
    },
    noSegments: true,
    disabled: false,
    activeTypes: [
      "1"
    ]
  },
  cdmx_metro: {
    name: "Mexico City Metro",
    url: "https://datos.cdmx.gob.mx/dataset/75538d96-3ade-4bc5-ae7d-d85595e4522d/resource/32ed1b6b-41cd-49b3-b7f0-b57acb0eb819/download/gtfs.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: false,
    colorOverrides: {},
    colorReplacements: {},
    noSegments: true,
    disabled: false,
    activeTypes: [
      "1"
    ]
  },
  mdot_metro: {
    name: "MDOT (Maryland) Metro",
    url: "https://feeds.mta.maryland.gov/gtfs/metro",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    noSegments: true,
    disabled: false,
    activeTypes: [
      "1"
    ]
  },
  southshore: {
    name: "South Shore Line",
    url: "http://www.mysouthshoreline.com/google/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: true,
    scheduleRunNumbersRequired: true,
    colorOverrides: {
      so_shore: [
        "EA6E10",
        "000000"
      ]
    },
    colorReplacements: {},
    noSegments: false,
    disabled: false,
    subfolder: "Working copy GTFS changes/",
    activeTypes: [
      "2"
    ]
  },
  casco_bay_lines: {
    name: "Casco Bay Lines",
    url: "http://smttracker.com/downloads/gtfs/cascobaylines-portland-me-usa.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  gp_metro: {
    name: "GP Metro",
    url: "http://www.smttracker.com/downloads/gtfs/greater-portland-me.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  south_portland: {
    name: "South Portland Bus Lines",
    url: "http://www.smttracker.com/downloads/gtfs/south-portland-me-us.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: []
  },
  marta: {
    name: "MARTA",
    url: "https://www.itsmarta.com/google_transit_feed/google_transit.zip",
    headers: {},
    urlEnv: [],
    doAllShapes: false,
    generateSchedules: false,
    scheduleRunNumbersRequired: true,
    colorOverrides: {},
    colorReplacements: {},
    disabled: false,
    activeTypes: [
      "1"
    ]
  }
};

module.exports = feeds;