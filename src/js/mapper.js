/* global Cesium  */
'use strict';
import {config} from './config.js';

import * as wildfires from './views/wildfires.js';

export function setup3dMap () {

  $('#summary-btn').click(function() {
    $('#summaryModal').modal('show');
    return false;
  });

  setUpCollapsibleInfoPanel();

  Cesium.BingMapsApi.defaultKey = config.bingAPIKey;
  Cesium.MapboxApi.defaultAccessToken = config.mapboxAccessToken;

  var viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    timeline: true,
    //homeButton: false,
    fullscreenButton: false,
    scene3DOnly: true,
    infoBox: false,
    navigationHelpButton: false,
    geocoder: false,
    terrainExaggeration: 2
  });

  wildfires.setupView(viewer);

}

function setUpCollapsibleInfoPanel() {

  $('#infoPanelSliderButton').click(function() {
    $('#infoPanel').toggleClass('collapsed');
    $('#cesiumContainer').toggleClass('col-xs-12 col-xs-9');
    $('#infoPanelSliderButton span').toggleClass('glyphicon-triangle-left glyphicon-triangle-right');
  });

  //$('#infoPanelSliderButton').click();

}
