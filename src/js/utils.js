'use strict';

export function makeCZMLAndStatsForListOfFires (f) {
  var mtbsCZML = [
    {
      id: 'document',
      name: 'MTBS',
      version: "1.0",
      clock: {
        interval: '1984-07-28T07:00:00.000Z/2014-12-31T23:59:59.999Z',
        currentTime: '1984-07-28T07:00:00.000Z',
        multiplier: 10000000,
        range: 'LOOP_STOP',
        step: 'SYSTEM_CLOCK_MULTIPLIER'
      }
    }
  ];

  var stats = {};
  var statsAll = {numFires: 0, fromYear: Infinity, toYear: -Infinity};
  var metricNames = [
    'acres',
    'severityHighAcres',
    'severityModerateAcres',
    'severityLowAcres',
    'severityUnburnedAcres',
    'severityIncreasedGreenesAcres',
    'nonProcessingMaskAcres',
    'forestAcres'
  ];

  f.features.forEach(function (feature) {
    var year = (new Date(feature.properties.ignitionDate)).getUTCFullYear();
    statsAll.fromYear = (statsAll.fromYear < year) ? statsAll.fromYear : year;
    statsAll.toYear = (statsAll.toYear > year) ? statsAll.toYear : year;

    metricNames.forEach(function(name) {
      if (!(year in stats)) {
        stats[year] = {numFires: 0};
      }
      if (!(name in stats[year])) {
        stats[year][name] = 0;
      }
      if (!(name in statsAll)) {
        statsAll[name] = 0;
      }
      stats[year][name] += feature.properties[name];
      statsAll[name] += feature.properties[name];
    });

    statsAll.numFires++;
    stats[year].numFires++;

    //var cylinderLength = 1000+feature.properties.forestAcres;
    var cylinderLength = 1000+feature.properties.severityHighAcres;
    var czmlItem = {
      id: feature.properties.id,
      name: 'Fire Name: ' + feature.properties.name,
      description:
        'Fire Id: ' + feature.properties.id + '<br>' +
        'Ignition Date: ' + feature.properties.ignitionDate + '<br>' +
        'Acres: ' + feature.properties.acres + '<br> Severity Acres: <br>&nbspHigh: ' +
          feature.properties.severityHighAcres + ' Moderate: ' +
          feature.properties.severityModerateAcres + ' Low: ' +
          feature.properties.severityLowAcres,
      availability: year + '-01-01T00:00:00.000Z' + '/' + year + '-12-31T23:59:59.999Z',
      cylinder: {
        topRadius: 500+Math.sqrt(feature.properties.acres*4046),
        bottomRadius:  500+Math.sqrt(feature.properties.acres*4046),
        //length: 1000+feature.properties.severityHighAcres,
        length: cylinderLength,
        outline: false,
        material : {
          solidColor : {
            color : {
                rgba : [255, 255-Math.ceil(255*Math.tanh(2*feature.properties.severityHighAcres/feature.properties.acres)), 0, 220]
            }
          }
        }
      },
      position: {
        cartographicDegrees: [feature.geometry.coordinates[0], feature.geometry.coordinates[1], feature.geometry.coordinates[2] + cylinderLength/2]
      }
    };

    mtbsCZML.push(czmlItem);
  });
  return {stats: stats, statsAll: statsAll, czml: mtbsCZML};
}

export function getFireExclusionList(data, threshold) {
  var fireExclusionList = [];
  data.features.reduce(function(a, c) {
    if (c.properties.forestAcres/c.properties.acres < threshold/100) {
      a.push(c.properties.id);
    }
    return a;
  }, fireExclusionList);
  return fireExclusionList;
}
