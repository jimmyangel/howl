/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';


var _viewer;
var or7dataSource;
var or7data;
var clockViewModel;
var animationViewModel;
var savedState;
var statsAll = {};

export function setupView (viewer) {
  $('#viewContainer').show();
  _viewer = viewer;

  //$(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  clockViewModel = new Cesium.ClockViewModel(_viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);
  /*_viewer.timeline.makeLabel = function(date) {
    var gregorianDate = Cesium.JulianDate.toGregorianDate(date);
    return gregorianDate.year;
  };*/

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  data.getJSONData('data/or7/or7F.json', function(data) {
    or7data = data;

    $('#loadingIndicator').hide();

    makeCZMLforOR7(function(or7CZML) {
      console.log('hey', or7CZML);

      Cesium.CzmlDataSource.load(or7CZML).then(function(dataSource) {
        or7dataSource = dataSource;

        _viewer.dataSources.add(or7dataSource).then(function() {
          _viewer.flyTo(or7dataSource).then(function() {
            // This is to prevent billboard from bouncing around
            or7dataSource.entities.getById('or7journey').billboard.show = true;
          });
          _viewer.camera.percentageChanged = 0.1;

          /* add the below to adjust width of corridors
          _viewer.camera.changed.addEventListener(function(e) {
            console.log('height', _viewer.camera.positionCartographic.height);
          }); */
          $('#resetView').click(function() {
            _viewer.flyTo(or7dataSource);
            return false;
          });

          viewdispatcher.cleanUrl('?view=or7');

        });
        console.log('hey');
      });

    });

    //var or7CZML = makeCZMLforOR7();

    /*or7data.features.forEach(function(feature, i) {

      if (feature.geometry.type === 'LineString') {


        var pos = [];

        feature.geometry.coordinates.forEach(function(c) {
          pos.push(c[0]);
          pos.push(c[1]);
          pos.push(c[2]+200);
        });

        _viewer.entities.add({
          corridor : {

              positions : Cesium.Cartesian3.fromDegreesArrayHeights(pos),

              extrudedHeight : 1000.0,
              width : 1000.0,
              cornerType: Cesium.CornerType.BEVELED,
              material : Cesium.Color.BLUE.withAlpha(0.5),
              outline : true,
              outlineColor : Cesium.Color.BLUE
              //heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });

      }

    });*/

    //or7dataSource = new Cesium.CustomDataSource('or7');

    /*or7data.features.forEach(function(feature, i) {
      //console.log(feature.geometry.coordinates);
      if (feature.geometry.type === 'LineString') {
        var pos = [-117.3456,44.7011,-120.85630000000002,43.5922];
        feature.geometry.coordinates.forEach(function(c) {
          pos.push(c[0]);
          pos.push(c[1]);
          pos.push(c[2]);
        });
        if (i === 0) {
          _viewer.entities.add({
            //position: pos[i],
            //point: {pixelSize: 10},
            corridor: {
              positions: Cesium.Cartesian3.fromDegreesArray([-117.3456,44.7011,-120.85630000000002,43.5922])
            }
          });
        }
      }
    }); */
  });

}

function makeCZMLforOR7(callback) {

  var bbImg = require('../../images/l-marker.png');

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
        multiplier: 10000000,
        range: 'LOOP_STOP',
        step: 'SYSTEM_CLOCK_MULTIPLIER'
      }
    },
    {
      id: 'or7journey',
      availability: '',
      billboard: {
          image: bbImg,
          show: false,
          heightReference: "RELATIVE_TO_GROUND"
      },
      position: {
        cartographicDegrees: []
      }
    }
  ];

  function CorridorItem(id, properties) {

    this.id = 'or7journey-c-' + id,
    this.corridor = {
      width: 2000,
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
            console.log(entries.features[entryIndex].properties.entryInfo);
            console.log(new Date(entries.features[entryIndex].properties.entryDate));
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
          console.log('polygon', or7Coord);
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
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(or7dataSource, true);

  or7data = or7dataSource = savedState = undefined;

}

function gotoAll() {

}

function setUpSummaryChart() {

}
