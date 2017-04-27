/* global Cesium  */
'use strict';
import {config} from './config.js';

import * as wildfires from './views/wildfires.js';

var viewer;

export function setup3dMap () {

  $('#summary-btn').click(function() {
    $('#summaryModal').modal('show');
    return false;
  });

  setUpCollapsibleInfoPanel();

  Cesium.BingMapsApi.defaultKey = config.bingAPIKey;
  Cesium.MapboxApi.defaultAccessToken = config.mapboxAccessToken;

  viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayerPicker: false,
    imageryProvider: config.imageryProviders[0].provider,
    animation: false,
    timeline: true,
    homeButton: false,
    fullscreenButton: false,
    scene3DOnly: true,
    //creditContainer: 'creditContainer',
    infoBox: false,
    navigationHelpButton: false,
    geocoder: false,
    terrainExaggeration: 2
  });

  populateBaseMapLayerControl();

  setUp3DZoomControls(200);

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

function zoomInOut3D(isZoomIn, minHeight) {
  // Smooth zoom parameters -- geo nicer than linear
  var ratio = 0.5;
  var numInc = 20;
  var msInc = 20;

  var cameraHeight = viewer.camera.positionCartographic.height;
  var zoomDistance = ((Math.abs((cameraHeight - minHeight)))/(Math.sin(Math.abs(viewer.camera.pitch))))/2;
  var moveIncrement = zoomDistance * (1-ratio)/(1-Math.pow(ratio, numInc));

  var i = 0;
  var intrvl = setInterval(function() {
    if (isZoomIn) {
      viewer.camera.zoomIn(moveIncrement*(Math.pow(ratio, i)));
    } else {
      viewer.camera.zoomOut(moveIncrement*(Math.pow(ratio, i))/ratio);
    }
    if (i++ >= numInc) {
      clearInterval(intrvl);
    }
  }, msInc);
}

function setUp3DZoomControls(minHeight) {
  // Set up zoom control click events
  $('.leaflet-control-zoom-in').off();
  $('.leaflet-control-zoom-in').click(function() {
    zoomInOut3D(true, minHeight);
    return false;
  });
  $('.leaflet-control-zoom-out').off();
  $('.leaflet-control-zoom-out').click(function() {
    zoomInOut3D(false, minHeight);
    return false;
  });
}

function populateBaseMapLayerControl() {

  for (var k=0; k<config.imageryProviders.length; k++) {
    $('#basemap-layer-control').append(
      '<label><input id="basemap-layer" value="' + k + '" type="radio" class="leaflet-control-layers-selector" name="leaflet-base-layers"' +
      ((k === 0) ? 'checked="checked"' : '' ) +  '><span> ' + config.imageryProviders[k].name + '</span></label>');
  }

  $('#basemap-layer-control').change(function() {
    var selectedLayer = $('#basemap-layer:checked').val();
    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
    var layer = viewer.imageryLayers.addImageryProvider(config.imageryProviders[selectedLayer].provider);
    viewer.imageryLayers.lowerToBottom(layer); // Base layer always at bottom
  });

  $('#layer-control').on('mouseenter touchstart', function() {
    if (!$('#layer-control').hasClass('leaflet-control-layers-expanded')) {
      $('#layer-control').addClass('leaflet-control-layers-expanded');
      return false;
    }
  });

  $('#layer-control').on('mouseleave', function() {
    $('#layer-control').removeClass('leaflet-control-layers-expanded');
  });

  $('#cesiumContainer').on('touchstart', function() {
    if ((!$(event.target).closest('#layer-control').length) && ($('#layer-control').hasClass('leaflet-control-layers-expanded'))) {
      $('#layer-control').removeClass('leaflet-control-layers-expanded');
    }
  });

  return;
}
