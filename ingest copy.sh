#tippecanoe -z12 --projection=EPSG:4326 --force -o transit.pmtiles -l zcta all.geojson
#tippecanoe -z12 --projection=EPSG:4326 --force -o amtrakerPre.pmtiles -l zcta allAmtraker.geojson
./pmtiles extract amtrakerPre.pmtiles amtraker.pmtiles --minzoom 12