/* global Cesium  */
'use strict';
import {config} from './config.js';
import {viewdispatcher} from './viewdispatcher.js';

// import * as wildfires from './views/wildfires.js';

import layerControl from '../templates/layerControl.hbs';
import featurePopUpContent from '../templates/featurePopUpContent.hbs';

var viewer;

export function setup3dMap (viewName) {

  //var view = require('./views/' + viewName + '.js');

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

  viewer.terrainProvider = new Cesium.CesiumTerrainProvider({url : 'https://assets.agi.com/stk-terrain/world'});

  populateLayerControl();

  setUp3DZoomControls(200);
  applyCursoStyle();
  handleFeaturePopUpClickEvents();

  viewdispatcher.setup(viewer);
  viewdispatcher.dispatch(viewName, true);

  //view.setupView(viewer);

}

function setUpCollapsibleInfoPanel() {

  $('#infoPanelSliderButton').click(function() {
    $('#infoPanel').toggleClass('collapsed');
    $('#cesiumContainer').toggleClass('col-xs-12 col-xs-9');
    $('#infoPanelSliderButton span').toggleClass('glyphicon-triangle-left glyphicon-triangle-right');
  });

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
    $('#overlay-layer:checked').each(function() {
      overlayLayers[$(this).val()].show = true;
    });
    $('#overlay-layer:not(:checked)').each(function() {
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

function applyCursoStyle() {
  // On hover, change cursor style
  var savedCursor = $('#cesiumContainer').css('cursor');
  var pointerCursorToggle = false;
  $('#cesiumContainer').on('mousemove', function (e) {
    var p = viewer.scene.pick(new Cesium.Cartesian2(e.offsetX, e.offsetY));
    if (Cesium.defined(p)) {
      var entity = p.id;
      if (entity instanceof Cesium.Entity) {
        if (!pointerCursorToggle) {
          pointerCursorToggle = true;
          $('#cesiumContainer').css('cursor', 'pointer');
        }
      } else {
        if (pointerCursorToggle) {
          pointerCursorToggle = false;
          $('#cesiumContainer').css('cursor', savedCursor);
        }
      }
    } else {
      if (pointerCursorToggle) {
        pointerCursorToggle = false;
        $('#cesiumContainer').css('cursor', savedCursor);
      }
    }
  });
}

function handleFeaturePopUpClickEvents() {
  $('#cesiumContainer').on('click touchstart', function (e) {
    function positionPopUp (c) {
      var x = c.x - ($('#featurePopUpContent').width()) / 2;
      var y = c.y - ($('#featurePopUpContent').height());
      $('#featurePopUpContent').css('transform', 'translate3d(' + x + 'px, ' + (y-15) + 'px, 0)');
    }

    var c;
    if (e.type === 'touchstart'){
      c = new Cesium.Cartesian2(e.originalEvent.touches[0].clientX, e.originalEvent.touches[0].clientY - 50);
    } else {
      c = new Cesium.Cartesian2(e.offsetX, e.offsetY);
    }

    var pArray = viewer.scene.drillPick(c, 1);
    if (Cesium.defined(pArray[0])) {
      var entity = pArray[0].id;
      if (entity instanceof Cesium.Entity) {
        if (entity.properties && entity.properties.howlHasFeaturePopUp && entity.properties.howlHasFeaturePopUp.getValue()) {
          $('#featurePopUp').html(featurePopUpContent(entity));
          console.log(entity.properties.Acres);
          //$('.popUpLink').off();
          $('.popUpLink').click(function () {
            if (viewdispatcher.popUpLinkClickHandler) {
              viewdispatcher.popUpLinkClickHandler($(this).attr('popUpEntityId'));
            }
            return false;
          });
          $('#featurePopUp').show();
          positionPopUp(c); // Initial position at the place item picked
          var removeHandler = viewer.scene.postRender.addEventListener(function () {
            //TODO: Get the height of the entity position via sampleTerrain (or populate height in data)
            var changedC = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, entity.position.getValue(Cesium.JulianDate.now()));
            if (changedC) {
              // If things moved, move the popUp too
              if ((c.x !== changedC.x) || (c.y !== changedC.y)) {
                positionPopUp(changedC);
                c = changedC;
              }
            }
          });

          $('.leaflet-popup-close-button').click(function() {
            $('#featurePopUp').hide();
            $('#featurePopUp').empty();
            removeHandler.call();
            return false;
          });
        }
      }
    }
  });
}
