/* global Cesium  */
'use strict';
import {config} from './config.js';

import * as wildfires from './views/wildfires.js';

import layerControl from '../templates/layerControl.hbs';

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

  /*viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider(
    {
      url: 'data/tiles/oldgrowth/{z}/{x}/{y}.png',
      maximumLevel: 12,
      rectangle : Cesium.Rectangle.fromDegrees(-124.5685,41.9595,-120.8112,45.9053)
    }
  ));

  viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider(
    {
      url: 'data/tiles/clearcuts/{z}/{x}/{y}.png',
      maximumLevel: 12,
      rectangle : Cesium.Rectangle.fromDegrees(-124.5026,41.9513,-116.7792,46.0275)
    }
  )); */

  populateLayerControl();

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

function populateLayerControl() {
  //console.log(layerControl({imageryProviders: config.imageryProviders}));

  $('#layerControl').html(layerControl({
    imageryProviders: config.imageryProviders,
    overlayImageryProviders: config.overlayImageryProviders
  }));

  $('#basemap-layer-control').change(function() {
    var selectedLayer = $('#basemap-layer:checked').val();
    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
    var layer = viewer.imageryLayers.addImageryProvider(config.imageryProviders[selectedLayer].provider);
    viewer.imageryLayers.lowerToBottom(layer); // Base layer always at bottom
  });

  var overlayLayers = [];
  config.overlayImageryProviders.forEach(function(overlayImageryProvider) {
    var oLayer = viewer.imageryLayers.addImageryProvider(overlayImageryProvider.provider);
    oLayer.show = false;
    if (overlayImageryProvider.alpha) {
      oLayer.alpha = overlayImageryProvider.alpha;
    }
    overlayLayers.push(oLayer);
  });

  $('#overlay-layer-control').change(function() {
    $('#overlay-layer:checked').each(function(index) {
      overlayLayers[$(this).val()].show = true;
    });
    $('#overlay-layer:not(:checked)').each(function(index) {
      overlayLayers[$(this).val()].show = false;
    });
  });

  $('#layerControl').on('mouseenter touchstart', function() {
    if (!$('#layerControl').hasClass('leaflet-control-layers-expanded')) {
      $('#layerControl').addClass('leaflet-control-layers-expanded');
      return false;
    }
  });

  $('#layerControl').on('mouseleave', function() {
    $('#layerControl').removeClass('leaflet-control-layers-expanded');
  });

  $('#cesiumContainer').on('touchstart', function() {
    if ((!$(event.target).closest('#layerControl').length) && ($('#layerControl').hasClass('leaflet-control-layers-expanded'))) {
      $('#layerControl').removeClass('leaflet-control-layers-expanded');
    }
  });

  return;
}

/*function populateOverlayLayerControl() {
  $('#overlay-layer-control').append(
    '<div class="leaflet-control-layers-separator"></div>' +
    '<div class="leaflet-control-layers-overlays">'
  );
  for (var k=0; k<config.overlayImageryProviders.length; k++) {
    $('#overlay-layer-control').append(
      '<label><input id="overlay-layer" value="' + k + '" type="checkbox" class="leaflet-control-layers-selector" name="leaflet-base-layers">' +
      '<span> ' + config.overlayImageryProviders[k].name + '</span></label>');
  }
  $('#overlay-layer-control').append('</div>');
}*/
