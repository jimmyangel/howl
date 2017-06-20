/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';

import or7InfoPanel from '../../templates/or7/or7InfoPanel.hbs';
import or7LogEntries from '../../templates/or7/or7LogEntries.hbs';
import or7ViewLabel from '../../templates/or7/or7ViewLabel.hbs';
import or7Chart from '../../templates/or7/or7Chart.hbs';

var labelDateOptions = {year: 'numeric', month: 'short', day: 'numeric' };

var _viewer;
var or7dataSource;
var or7kmlDataSource;
var or7StoryMapLayer;
var or7data;
var clockViewModel;
var animationViewModel;
var statsAll;
var viewerCallbacks = [];

export function setupView (viewer) {
  $('#viewContainer').show();
  _viewer = viewer;

  //$(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  clockViewModel = new Cesium.ClockViewModel(_viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);

  // TODO: localize and make MMM/YYYY
  _viewer.timeline.makeLabel = function(date) {
    var gregorianDate = Cesium.JulianDate.toGregorianDate(date);
    return gregorianDate.month + '/' + gregorianDate.year;
  };

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  //_viewer.scene.globe.depthTestAgainstTerrain = true;
  $('#infoPanel').html(or7InfoPanel());

  // Show timeline
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  _viewer.timeline.resize();

  data.getJSONData('data/or7/or7F.json', function(data) {
    or7data = data;

    $('#loadingIndicator').hide();

    makeCZMLforOR7(function(or7CZML) {

      Cesium.CzmlDataSource.load(or7CZML).then(function(dataSource) {
        or7dataSource = dataSource;
        var or7JourneyEntity = or7dataSource.entities.getById('or7journey');
        or7JourneyEntity.orientation = new Cesium.VelocityOrientationProperty(or7JourneyEntity.position);

        _viewer.dataSources.add(or7dataSource).then(function() {

          utils.setupPlaybackControlActions(animationViewModel, clockViewModel);

          viewerCallbacks.push(_viewer.timeline.addEventListener('settime', function() {
            utils.setPlaybackPauseMode();
          }, false));

          viewerCallbacks.push(_viewer.clock.onTick.addEventListener(function(event) {
            var lastDate;
            var currDate = Cesium.JulianDate.toDate(event.currentTime).toLocaleDateString('en-US', labelDateOptions);
            if (lastDate !== currDate) {
              lastDate = currDate;
              $('#or7PosDate').text(currDate);
              var propertyValues = or7dataSource.entities.getById('or7entries').properties.getValue(_viewer.clock.currentTime);
              $('#or7LastEvent').text(propertyValues.entries);
            }

            // At the end of the journey, reset play button
            if (event.currentTime.equals(_viewer.clock.stopTime)) {
              utils.setPlaybackPauseMode()
            }
          }));

          _viewer.flyTo(or7dataSource).then(function() {
            // This is to prevent billboard from bouncing around
            or7JourneyEntity.model.show = true;
            _viewer.camera.percentageChanged = 0.1;

            // AAdjust width of corridors depending on camera height
            viewerCallbacks.push(_viewer.camera.changed.addEventListener(function() {
              if (or7dataSource) {  // This listener may still be active, so prevent crap out
                or7CZML.forEach(function(item) {
                  if (item.corridor) {
                    var w = corridorWidth(_viewer.camera.positionCartographic.height);
                    w = item.properties.isBorder ? w*2 : w;
                    if (w != or7dataSource.entities.getById(item.id).corridor.width) {
                      or7dataSource.entities.getById(item.id).corridor.width = w;
                    }
                  }
                });
              }
            }));
          });

          $('#resetView').click(function() {
            _viewer.flyTo(or7dataSource);
            return false;
          });

          $('#viewLabel').html(or7ViewLabel());
          $('#viewLabel').show();

          $('#summaryChartContainer').html(or7Chart({miles: Number(statsAll.distanceData[statsAll.distanceData.length-1]).toLocaleString()}));
          setUpSummaryChart();

          viewdispatcher.cleanUrl('?view=or7');

        });
      });

      Cesium.KmlDataSource.load('data/or7/or7.kmz').then(function(dataSource) {
        or7kmlDataSource = dataSource;
        dataSource.show = false;

        dataSource.entities.values.forEach(function(value) {
          if (value.name === 'OR7v2') {
            or7StoryMapLayer = _viewer.imageryLayers.addImageryProvider(
              new Cesium.SingleTileImageryProvider({
                url: value.rectangle.material.image,
                rectangle: new Cesium.Rectangle(
                  value.rectangle.coordinates.getValue().west,
                  value.rectangle.coordinates.getValue().south,
                  value.rectangle.coordinates.getValue().east,
                  value.rectangle.coordinates.getValue().north
                ),
                credit: 'Wolf OR-7 Expedition'
              })
            );
            or7StoryMapLayer.show = false;
            $('#story-map-overlay').change(function() {
              if ($(this).is(":checked")) {
                or7StoryMapLayer.show = true;
              } else {
                or7StoryMapLayer.show = false;
              }
            });
            $('#infoPanelTransparency').change(function() {
              var t=($(this).val())/100;
              or7StoryMapLayer.alpha = t;
            });
            $('#infoPanelTransparency').change();
          }
        });


        //_viewer.dataSources.add(dataSource)
      });

    });
  });

}

function corridorWidth(h) {
  var w = h>500000 ? h/100: h/50;
  return Math.min(20*Math.round(w/20), 2000);
}

function makeCZMLforOR7(callback) {

  var durations = [0];
  var prevCoord;

  var or7CZML = [
    {
      id: 'document',
      name: 'OR7',
      version: "1.0",
      clock: {
        interval: '',
        currentTime: '',
        multiplier: 262975,
        range: 'CLAMPED',
        step: 'SYSTEM_CLOCK_MULTIPLIER'
      }
    },
    {
      id: 'or7journey',
      availability: '',
      model: {
        gltf: 'data/or7/model/wolf.gltf',
        scale: 1.5,
        minimumPixelSize: 128,
        //runAnimations: false,
        //shadowMode: 'DISABLED',
        //incrementallyLoadTextures: false,
        heightReference: 'RELATIVE_TO_GROUND',
        silhouetteSize: 2.0,
        silhouetteColor: {
          rgba: [255, 255, 255, 255]
        },
        show: false
      },
      position: {
        cartographicDegrees: []
      }
    },
    {
      id: 'or7entries',
      properties: {
        entries: []
      }
    }
  ];

  function CorridorItem(id, prop, colorOverrride) {

    this.id = 'or7journey-c-' + id,
    this.properties = {
      isBorder: colorOverrride ? true : false,
    };
    this.position = {cartographicDegrees: []};
    this.corridor = {
      width: colorOverrride ? 2*corridorWidth(600000) : corridorWidth(600000),
      material: {
        solidColor: {
          color: {
            rgba: (colorOverrride) ? ((Cesium.Color.fromCssColorString(colorOverrride)).toBytes()) : (getColor(prop))
          }
        }
      },
      cornerType: 'MITERED',
      positions: {
        cartographicDegrees: []
      }
    }
  }

  function PolygonItem(id, prop) {

    this.id = 'or7journey-p-' + id;
    this.properties = prop;
    this.position = {cartographicDegrees: []};
    if (prop.entryDate) {
      this.availability = (new Date(prop.entryDate)).toISOString() + '/';
      if (prop.exitDate) {
        this.availability += (new Date(prop.exitDate)).toISOString();
      } else {
        this.availability += (new Date()).toISOString();
      }
    }
    this.polygon = {
      positions: {
        cartographicDegrees: []
      },
      material: {
        solidColor: {
          color: {
            rgba: getColor(prop)
          }
        }
      }
    }
  }

  /*function LabelItem(id, prop, text) {

    this.id = 'or7journey-l-' + id;
    this.properties = prop;
    //this.position = {cartographicDegrees: []};
    if (prop.entryDate) {
      this.availability = (new Date(prop.entryDate)).toISOString() + '/';
      if (prop.exitDate) {
        this.availability += (new Date(prop.exitDate)).toISOString();
      } else {
        this.availability += (new Date()).toISOString();
      }
    }
    this.label = {
      positions: {
        cartographicDegrees: []
      },
      text: text,
      fillColor: (Cesium.Color.BLACK)
    }
  }*/

  function getColor(properties) {
    var color = [255, 255, 255, 255];
    if (properties && properties.fill) {
      color = (Cesium.Color.fromCssColorString(properties.fill)).toBytes();
      color[3] = (properties['fill-opacity']) ? (255 * properties['fill-opacity']) : 255;
    }
    return color;
  }

  data.getJSONData('data/or7/or7entriesF.json', function(entries) {
    data.getJSONData('data/or7/or7areascrossed.json', function(xareas) {

      // Assumption: first entry matches first coordinate and last entry matches last coordinate
      var fromDate = (new Date(entries.features[0].properties.entryDate)).toISOString();
      var toDate = (new Date(entries.features[entries.features.length-1].properties.entryDate)).toISOString();
      or7CZML[0].clock.interval = fromDate + '/' + toDate;
      or7CZML[1].availability = or7CZML[0].clock.interval;
      or7CZML[0].clock.currentTime = fromDate;

      initStats(fromDate, toDate);

      var logEntries = [];
      for (var i=0; i<entries.features.length; i++) {
        if (i > 0) {
          // Compute segment durations
          durations.push(calcDuration(entries.features[i].properties.entryDate, entries.features[i-1].properties.entryDate));
        }
        // Update czml custom properties
        var d1 = (new Date(entries.features[i].properties.entryDate)).toISOString();
        var d2 = (i === entries.features.length-1) ? d1 : (new Date(entries.features[i+1].properties.entryDate)).toISOString();
        or7CZML[2].properties.entries.push(
          {
            interval: d1 + '/' + d2,
            string: entries.features[i].properties.entryInfo
          }
        );
        // Update entry log info for panel
        logEntries.push(
          {
            date: (new Date(entries.features[i].properties.entryDate)).toLocaleDateString('en-US', labelDateOptions),
            info: entries.features[i].properties.entryInfo
          }
        );
      }
      $('#logEntries').html(or7LogEntries({logEntries: logEntries}));

      // Calculate leg distances
      var distances = new Array(durations.length).fill(0);
      var entryIndex = 0;
      or7data.features.forEach(function(or7f) {
        if (or7f.geometry.type === 'LineString') {
          or7f.geometry.coordinates.forEach(function(or7Coord) {
            if (isSameCoordinates(or7Coord, entries.features[entryIndex].geometry.coordinates)) {
              entryIndex++;
            } else {
              distances[entryIndex] += calcDistance(prevCoord, or7Coord);
            }
            prevCoord = or7Coord;
          });
        }
      });

      // Interpolate time
      var sumD = 0;
      var cumD = 0;
      entryIndex = 0;
      var itemId = 0;
      or7data.features.forEach(function(or7f) {
        if (or7f.geometry.type === 'LineString') {
          var corridorItem = new CorridorItem(itemId++, or7f.properties);
          var corridorOutlineItem = new CorridorItem(itemId++, or7f.properties, '#8D6E27');
          corridorItem.position.cartographicDegrees.push(or7f.geometry.coordinates[0][0], or7f.geometry.coordinates[0][1], or7f.geometry.coordinates[0][2]);
          or7f.geometry.coordinates.forEach(function(or7Coord) {
            var iDate;
            if (isSameCoordinates(or7Coord, entries.features[entryIndex].geometry.coordinates)) {
              iDate = (new Date(entries.features[entryIndex].properties.entryDate)).toISOString();
              or7CZML[1].position.cartographicDegrees.push(iDate);
              sumD = 0;
              //prevCoord = or7Coord;
              entryIndex++;
            } else {
              //var distance = calcDistance(prevCoord, or7Coord);
              sumD += calcDistance(prevCoord, or7Coord);
              //cumD += distance;
              var ratio = sumD/distances[entryIndex];
              iDate = (new Date(Date.parse(entries.features[entryIndex-1].properties.entryDate) + ratio * durations[entryIndex])).toISOString();
              or7CZML[1].position.cartographicDegrees.push(iDate)
            }
            cumD += calcDistance(prevCoord, or7Coord);
            updateStats(iDate, cumD, or7Coord[2]);
            prevCoord = or7Coord;
            or7CZML[1].position.cartographicDegrees.push(or7Coord[0]);
            or7CZML[1].position.cartographicDegrees.push(or7Coord[1]);
            or7CZML[1].position.cartographicDegrees.push(0);
            corridorItem.corridor.positions.cartographicDegrees.push(or7Coord[0]);
            corridorItem.corridor.positions.cartographicDegrees.push(or7Coord[1]);
            corridorItem.corridor.positions.cartographicDegrees.push(0);
            corridorOutlineItem.corridor.positions.cartographicDegrees.push(or7Coord[0]);
            corridorOutlineItem.corridor.positions.cartographicDegrees.push(or7Coord[1]);
            corridorOutlineItem.corridor.positions.cartographicDegrees.push(0);
          });
          or7CZML.push(corridorOutlineItem);
          or7CZML.push(corridorItem);
        }
        if (or7f.geometry.type === 'Polygon') {
          var polygonItem = new PolygonItem(itemId++, or7f.properties);
          polygonItem.position.cartographicDegrees.push(or7f.geometry.coordinates[0][0][0], or7f.geometry.coordinates[0][0][1], or7f.geometry.coordinates[0][0][2]);
          or7f.geometry.coordinates[0].forEach(function(or7Coord) {
            polygonItem.polygon.positions.cartographicDegrees.push(or7Coord[0]);
            polygonItem.polygon.positions.cartographicDegrees.push(or7Coord[1]);
            polygonItem.polygon.positions.cartographicDegrees.push(0);
          });
          or7CZML.push(polygonItem);
        }
      });

      xareas.features.forEach(function(xarea) {
        if (xarea.geometry.type === 'Polygon') {
          var polygonItem = new PolygonItem(itemId++, xarea.properties);
          polygonItem.position.cartographicDegrees.push(xarea.geometry.coordinates[0][0][0], xarea.geometry.coordinates[0][0][1], 0);
          xarea.geometry.coordinates[0].forEach(function(xareaCoord) {
            polygonItem.polygon.positions.cartographicDegrees.push(xareaCoord[0]);
            polygonItem.polygon.positions.cartographicDegrees.push(xareaCoord[1]);
            polygonItem.polygon.positions.cartographicDegrees.push(0);
          });
          or7CZML.push(polygonItem);
        }
      });
      fixStats();

      callback(or7CZML);
    });
  });
}

function calcDuration(d1, d2) {
  return Date.parse(d1) - Date.parse(d2);
}

function calcDistance(p1, p2) {
  return Cesium.Cartesian3.distance(Cesium.Cartesian3.fromDegrees(p1[0], p1[1]), Cesium.Cartesian3.fromDegrees(p2[0], p2[1]));
}

function isSameCoordinates(c1, c2) {
  return ((c1[0] === c2[0]) && (c1[1] === c2[1]));
}

function initStats(fromDate, toDate) {
  statsAll = {labels: [], samples: [], distanceData: [], elevationData: [], maxElevation: [], minElevation: [], labelIndices: {}};
  var fromYear = parseInt(fromDate.substring(0, 4));
  var toYear = parseInt(toDate.substring(0, 4));
  var fromMonth = parseInt(fromDate.substring(5, 7));
  var toMonth = parseInt(toDate.substring(5, 7));

  function pushStat(m, y) {
    statsAll.labels.push(m + '/' + y);
    statsAll.samples.push(0);
    statsAll.distanceData.push(0);
    statsAll.elevationData.push(0);
    statsAll.maxElevation.push(0);
    statsAll.minElevation.push(Infinity);
    statsAll.labelIndices[statsAll.labels[statsAll.labels.length-1]] = statsAll.labels.length-1;
  }

  for (var y=fromYear; y<=toYear; y++) {
    for (var m=1; m<=12; m++) {
      if (y === fromYear) {
        if (m >= fromMonth) {pushStat(m, y);}
      } else {
        if (y === toYear) {
          if (m <= toMonth) {pushStat(m, y);}
        } else {
          pushStat(m, y);
        }
      }
    }
  }
}

function updateStats(date, distance, elevation) {
  elevation = elevation * 3.28084;
  var label = parseInt(date.substring(5, 7)) + '/' + parseInt(date.substring(0, 4));
  var idx = statsAll.labelIndices[label];
  statsAll.samples[idx]++;
  statsAll.distanceData[idx] = distance/1609.34;
  statsAll.elevationData[idx] += elevation;
  statsAll.maxElevation[idx] = (statsAll.maxElevation[idx] > elevation) ? statsAll.maxElevation[idx] : elevation;
  statsAll.minElevation[idx] = (statsAll.minElevation[idx] < elevation) ? statsAll.minElevation[idx] : elevation;

}

function fixStats() {
  for (var i=0; i<statsAll.distanceData.length; i++) {
    if (statsAll.samples[i] > 0) {
      statsAll.elevationData[i] = statsAll.elevationData[i] / statsAll.samples[i];
    }
    if (i>0 && statsAll.distanceData[i] === 0) {
      statsAll.distanceData[i] = statsAll.distanceData[i-1];
      statsAll.elevationData[i] = statsAll.elevationData[i-1];
      statsAll.maxElevation[i] = statsAll.maxElevation[i-1];
      statsAll.minElevation[i] = statsAll.minElevation[i-1];
    }
    statsAll.distanceData[i] = Number(statsAll.distanceData[i]).toFixed();
    statsAll.elevationData[i] = Number(statsAll.elevationData[i]).toFixed();
    statsAll.maxElevation[i] = Number(statsAll.maxElevation[i]).toFixed();
    statsAll.minElevation[i] = Number(statsAll.minElevation[i]).toFixed();
  }
}

export function restoreView() {

}

export function wipeoutView() {
  $('#viewLabel').empty();
  $('#viewLabel').hide();
  $('#infoPanel').empty();
  $('#summaryChartContainer').empty();

  viewerCallbacks.forEach(function(removeCallback) {
    if (removeCallback) {
       removeCallback();
    }
  });

  _viewer.dataSources.remove(or7dataSource, true);
  _viewer.dataSources.remove(or7kmlDataSource, true);
  _viewer.imageryLayers.remove(or7StoryMapLayer);

  or7data = or7dataSource = or7kmlDataSource = or7StoryMapLayer = statsAll = undefined;

}

function setUpSummaryChart() {
  var ctx = $('#summaryChart')[0];

  var datasets = [
    {
      type: 'line',
      label: 'Distance',
      yAxisID: 'miles',
      data: statsAll.distanceData,
      backgroundColor: 'rgba(255, 217, 204, 0.3)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1
    },
    {
      type: 'line',
      label: 'Avg Elevation',
      yAxisID: 'feet',
      data: statsAll.elevationData,
      backgroundColor: 'rgba(204, 255, 242, 0.8)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1
    }
  ]

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: statsAll.labels,
      datasets: datasets
    },
    options: {
      scales: {
        yAxes: [{
          position: 'left',
          id: 'miles',
          ticks: {beginAtZero:true},
          scaleLabel: {
            display: true,
            labelString: 'Distance in miles'
          }
        }, {
          position: "right",
          id: 'feet',
          ticks: {beginAtZero:true},
          scaleLabel: {
            display: true,
            labelString: 'Average elevation in feet'
          }
        }]
      }
    }
  });

}
