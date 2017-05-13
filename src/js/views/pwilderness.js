/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';


var statsAll;
var _viewer;
var pwildernessListDataSource;
var savedState;

export function setupView (viewer) {
  $('#viewContainer').show();
  _viewer = viewer;

  _viewer.terrainProvider = new Cesium.CesiumTerrainProvider({url : 'https://assets.agi.com/stk-terrain/world'});
  //viewer.scene.globe.depthTestAgainstTerrain = true;

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  //data.getJSONData('data/MTBS/MTBSCZML.json', function(data) {
  Cesium.GeoJsonDataSource.load('data/pwilderness/Windex.json').then(function(dataSource) {
    $('#loadingIndicator').hide();
    pwildernessListDataSource = dataSource;

    _viewer.dataSources.add(dataSource).then(function() {
      $('#resetView').click(function() {
        _viewer.camera.flyTo(config.initialCameraView);
        return false;
      });

    });
  });

}

export function restoreView() {

}

export function wipeoutView() {
  _viewer.dataSources.remove(pwildernessListDataSource, true);
}

function setUpInfoBox() {

}


function showInfoBox() {
  $('#infoBox').animate({'margin-right': 0, opacity: 0.8}, 200);
}

function hideInfoBox() {
  $('#infoBox').animate({'margin-right': '-30%', opacity: 0}, 200);
}

function setUpSummaryChart() {

}
