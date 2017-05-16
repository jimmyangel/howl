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

    var h, m, l;
    /*var tot = feature.properties.severityHighAcres +
                feature.properties.severityModerateAcres +
                  feature.properties.severityLowAcres; */

    var tot = feature.properties.acres;

    var sev = [];
    var colors = [
      {r:255, g:0, b:0},
      {r:255, g:255, b:0},
      {r:121, g:255, b:211},
    ]

    h = feature.properties.severityHighAcres/tot;
    m = feature.properties.severityModerateAcres/tot;
    l = feature.properties.severityLowAcres/tot;
    //u = feature.properties.severityUnburnedAcres/tot;

    sev.push(h); sev.push(m); sev.push(l); //sev.push(u);

    var idxMax = sev.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);

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
        length: cylinderLength,
        outline: false,
        material : {
          solidColor : {
            color : {
              rgba: [colors[idxMax].r, colors[idxMax].g, colors[idxMax].b, 200]
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

export function getUrlVars() {
	var urlVars = [];
	var varArray = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for (var i = 0; i < varArray.length; i++) {
		var urlVar = varArray[i].split('=');
		urlVars[urlVar[0]] = urlVar[1];
	}
	return urlVars;
}

export function makeCZMLAndStatsForListOfpwilderness (w) {

  var pwildernessCZML = [
    {
      id: 'document',
      name: 'pwilderness',
      version: "1.0"
    }
  ];

  w.features.forEach(function (feature) {
    var czmlItem = {
      id: feature.properties.featureCollectionId,
      name: feature.properties.proposedWildernessAreaName,
      /*cylinder: {
        topRadius: Math.sqrt(feature.properties.acres*4046),
        bottomRadius:  Math.sqrt(feature.properties.acres*4046),
        length: 100,
        outline: false,
        material : {
          solidColor : {
            color : {
              rgba: [255, 255, 0, 128]
            }
          }
        }
      },*/
      billboard: {
        image: require('../images/l-marker.png'),
        scale: 1,
        heightReference: 'RELATIVE_TO_GROUND'
      },
      /*label: {
        text: feature.properties.proposedWildernessAreaName.replace(/ /g, '\r\n'),
        fillColor: {'rgba':[0,0,0,255]},
        showBackground: true,
        backgroundColor: {'rgba': [255,255,255,128]},
        verticalOrigin: 'TOP',
        scale: 0.5,
        heightReference: 'RELATIVE_TO_GROUND'
      },*/
      position: {
        cartographicDegrees: [feature.geometry.coordinates[0], feature.geometry.coordinates[1], 1000]
      },
      properties: {
        howlHasFeaturePopUp: true
      }
    }
    pwildernessCZML.push(czmlItem);
  });
  return {czml: pwildernessCZML};
}
