/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';

import or7InfoPanel from '../../templates/or7/or7InfoPanel.hbs';

var _viewer;
var or7dataSource;
var or7data;
var clockViewModel;
var animationViewModel;
var savedState;
var statsAll = {};
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

  data.getJSONData('data/or7/or7F.json', function(data) {
    or7data = data;

    $('#loadingIndicator').hide();

    makeCZMLforOR7(function(or7CZML) {

      Cesium.CzmlDataSource.load(or7CZML).then(function(dataSource) {
        or7dataSource = dataSource;
        var or7JourneyEntity = or7dataSource.entities.getById('or7journey');
        or7JourneyEntity.orientation = new Cesium.VelocityOrientationProperty(or7JourneyEntity.position);

        _viewer.dataSources.add(or7dataSource).then(function() {
          $('#infoPanel').html(or7InfoPanel());
          utils.setupPlaybackControlActions(animationViewModel, clockViewModel);

          viewerCallbacks.push(_viewer.timeline.addEventListener('settime', function() {
            utils.setPlaybackPauseMode();
          }, false));

          viewerCallbacks.push(_viewer.scene.postRender.addEventListener(function()  {
            utils.updateSpeedLabel(clockViewModel);
          }));

          _viewer.flyTo(or7dataSource).then(function() {
            // This is to prevent billboard from bouncing around
            or7JourneyEntity.model.show = true;
          _viewer.camera.percentageChanged = 0.1;

          //add the below to adjust width of corridors
            viewerCallbacks.push(_viewer.camera.changed.addEventListener(function(e) {
              or7CZML.forEach(function(item) {
                if (item.corridor) {
                  var w = corridorWidth(_viewer.camera.positionCartographic.height);
                  if (w != or7dataSource.entities.getById(item.id).corridor.width) {
                    or7dataSource.entities.getById(item.id).corridor.width = w;
                  }
                }
              });
            }));
          });

          $('#resetView').click(function() {
            _viewer.flyTo(or7dataSource);
            return false;
          });

          viewdispatcher.cleanUrl('?view=or7');

        });
      });

      Cesium.KmlDataSource.load('data/or7/or7.kmz').then(function(dataSource) {
        dataSource.show = false;

        dataSource.entities.values.forEach(function(value) {
          if (value.name === 'OR7v2') {
            var or7StoryMapLayer = _viewer.imageryLayers.addImageryProvider(
              new Cesium.SingleTileImageryProvider({
                url: value.rectangle.material.image,
                rectangle: new Cesium.Rectangle(
                  value.rectangle.coordinates.getValue().west,
                  value.rectangle.coordinates.getValue().south,
                  value.rectangle.coordinates.getValue().east,
                  value.rectangle.coordinates.getValue().north
                )
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
  // This array should probably go to config
  var t = [[1000000, 8000], [600000, 4000], [100000, 3000], [40000, 2000], [20000, 1000], [10000, 500]];
  for (var i=0; i<t.length; i++) {
    if (h >= t[i][0]) return t[i][1];
  }
  return t[t.length - 1][1];
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
        multiplier: 1000000,
        range: 'LOOP_STOP',
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
        runAnimations: false,
        shadowMode: 'DISABLED',
        incrementallyLoadTextures: false,
        heightReference: 'RELATIVE_TO_GROUND',
        show: false
      },
      position: {
        cartographicDegrees: []
      }
    }
  ];

  function CorridorItem(id, properties) {

    this.id = 'or7journey-c-' + id,
    this.corridor = {
      width: 4000,
      material: {
        solidColor: {
          color: {
            rgba: getColor(properties)
          }
        }
      },
      positions: {
        cartographicDegrees: []
      }
    }
  }

  function PolygonItem(id, properties) {

    this.id = 'or7journey-p-' + id;
    if (properties.entryDate) {
      this.availability = (new Date(properties.entryDate)).toISOString() + '/';
      if (properties.exitDate) {
        this.availability += (new Date(properties.exitDate)).toISOString();
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
            rgba: getColor(properties)
          }
        }
      }
    }
  }

  function getColor(properties) {
    var color = [255, 255, 255, 255];
    if (properties && properties.fill) {
      color = (Cesium.Color.fromCssColorString(properties.fill)).toBytes();
      color[3] = (properties['fill-opacity']) ? (255 * properties['fill-opacity']) : 255;
    }
    return color;
  }

  data.getJSONData('data/or7/or7entriesF.json', function(entries) {
    or7CZML[0].clock.interval =
      (new Date(entries.features[0].properties.entryDate)).toISOString() + '/' +
      (new Date(entries.features[entries.features.length-1].properties.entryDate)).toISOString();
    or7CZML[1].availability = or7CZML[0].clock.interval;
    or7CZML[0].clock.currentTime = (new Date(entries.features[0].properties.entryDate)).toISOString();

    for (var i=1; i<entries.features.length; i++) {
      durations.push(calcDuration(entries.features[i].properties.entryDate, entries.features[i-1].properties.entryDate));
    }

    // Calculate leg distances
    var distances = new Array(durations.length).fill(0);
    var entryIndex = 0;
    or7data.features.forEach(function(or7f) {
      if (or7f.geometry.type === 'LineString') {
        or7f.geometry.coordinates.forEach(function(or7Coord) {
          if (isSameCoordinates(or7Coord, entries.features[entryIndex].geometry.coordinates)) {
            prevCoord = or7Coord;
            entryIndex++;
          } else {
            distances[entryIndex] += calcDistance(prevCoord, or7Coord);
          }
        });
      }
    });

    // Interpolate time
    var sumD = 0;
    entryIndex = 0;
    var itemId = 0;
    or7data.features.forEach(function(or7f) {
      if (or7f.geometry.type === 'LineString') {
        var corridorItem = new CorridorItem(itemId++, or7f.properties);
        or7f.geometry.coordinates.forEach(function(or7Coord) {
          if (isSameCoordinates(or7Coord, entries.features[entryIndex].geometry.coordinates)) {
            or7CZML[1].position.cartographicDegrees.push((new Date(entries.features[entryIndex].properties.entryDate).toISOString()))
            sumD = 0;
            prevCoord = or7Coord;
            entryIndex++;
          } else {
            sumD += calcDistance(prevCoord, or7Coord);
            var ratio = sumD/distances[entryIndex];
            var iDate = new Date(Date.parse(entries.features[entryIndex-1].properties.entryDate) + ratio * durations[entryIndex]);
            or7CZML[1].position.cartographicDegrees.push(iDate.toISOString())

          }
          or7CZML[1].position.cartographicDegrees.push(or7Coord[0]);
          or7CZML[1].position.cartographicDegrees.push(or7Coord[1]);
          or7CZML[1].position.cartographicDegrees.push(0);
          corridorItem.corridor.positions.cartographicDegrees.push(or7Coord[0]);
          corridorItem.corridor.positions.cartographicDegrees.push(or7Coord[1]);
          corridorItem.corridor.positions.cartographicDegrees.push(0);
        });
        or7CZML.push(corridorItem);
      }
      if (or7f.geometry.type === 'Polygon') {
        var polygonItem = new PolygonItem(itemId++, or7f.properties);
        or7f.geometry.coordinates[0].forEach(function(or7Coord) {
          polygonItem.polygon.positions.cartographicDegrees.push(or7Coord[0]);
          polygonItem.polygon.positions.cartographicDegrees.push(or7Coord[1]);
          polygonItem.polygon.positions.cartographicDegrees.push(0);
        });
        or7CZML.push(polygonItem);
      }
    });

    callback(or7CZML);

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

export function restoreView() {

}

export function wipeoutView() {
  $('#infoPanel').empty();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(or7dataSource, true);

  viewerCallbacks.forEach(function(removeCallback) {
    if (removeCallback) {
       removeCallback();
    }
  });
  or7data = or7dataSource = savedState = undefined;

}

function gotoAll() {

}

function setUpSummaryChart() {

}
