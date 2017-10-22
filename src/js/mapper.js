/* global Cesium  */
'use strict';
import Chart from 'chart.js';
import Spinner from 'spin';

import {config} from './config.js';
import {viewdispatcher} from './viewdispatcher.js';
import * as utils from './utils.js';

// import * as wildfires from './views/wildfires.js';

import layerControl from '../templates/layerControl.hbs';
import featurePopUpContent from '../templates/featurePopUpContent.hbs';

var viewer;

window.spinner = new Spinner(config.spinnerOpts);

export function setup3dMap (viewName) {

  $('#summary-btn').click(function() {
    $('#summaryModal').modal('show');
    return false;
  });

  setUpCollapsibleInfoPanel();

  viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayerPicker: false,
    imageryProvider: config.imageryProviders[0].provider,
    animation: false,
    timeline: true,
    homeButton: false,
    fullscreenButton: false,
    scene3DOnly: true,
    infoBox: false,
    navigationHelpButton: false,
    geocoder: false,
    skyBox: false,
    terrainExaggeration: 2
  });

  viewer.scene.fxaa = false;

  // Globally disable entity tracking on double click
  (new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)).setInputAction(function() {
      viewer.trackedEntity = undefined;
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  viewer.terrainProvider = new Cesium.CesiumTerrainProvider({url : 'https://assets.agi.com/stk-terrain/world'});

  populateLayerControl();

  setUp3DZoomControls(200);
  applyCursoStyle();
  handleFeaturePopUpClickEvents();

  registerChartPlugins();

  viewdispatcher.setup(viewer);
  viewdispatcher.dispatch(viewName);

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

  // Basemaps
  $('#basemap-layer-control').change(function() {
    var selectedLayer = $('#basemap-layer:checked').val();
    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
    var layer = viewer.imageryLayers.addImageryProvider(config.imageryProviders[selectedLayer].provider);
    viewer.imageryLayers.lowerToBottom(layer); // Base layer always at bottom
  });

  // State boundary
  Cesium.GeoJsonDataSource.load(config.dataPaths.stateBoundary, {
      clampToGround: true,
      strokeWidth: config.stateBoundaryOpts.strokeWidth,
      stroke: (Cesium.Color.fromCssColorString(config.stateBoundaryOpts.strokeColor)).withAlpha(config.stateBoundaryOpts.strokeOpacity)
    }).then(function(ds) {
    $('#state-layer-control').change(function() {
      ds.show = $('#state-boundary-layer').is(':checked')
    });
    viewer.dataSources.add(ds);
  });

  // Layer overlays
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
  utils.cursor.saved = $('#cesiumContainer').css('cursor');
  utils.cursor.default = utils.cursor.saved;
  var pointerCursorToggle = false;
  $('#cesiumContainer').on('mousemove', function (e) {
    var p = viewer.scene.pick(new Cesium.Cartesian2(e.offsetX, e.offsetY));
    if (Cesium.defined(p)) {
      var entity = p.id;
      if (entity instanceof Cesium.Entity) {
        if (entity.properties && entity.properties.getValue().doNotPick) return;
        if (!pointerCursorToggle) {
          pointerCursorToggle = true;
          $('#cesiumContainer').css('cursor', 'pointer');
        }
      } else {
        if (pointerCursorToggle) {
          pointerCursorToggle = false;
          $('#cesiumContainer').css('cursor', utils.cursor.saved);
        }
      }
    } else {
      if (pointerCursorToggle) {
        pointerCursorToggle = false;
        $('#cesiumContainer').css('cursor', utils.cursor.saved);
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
          //$('.popUpLink').off();
          $('.popUpLink').click(function () {
            if (viewdispatcher.popUpLinkClickHandler) {
              viewdispatcher.popUpLinkClickHandler(entity.id);
            }
            return false;
          });
          $('#featurePopUp').show();
          positionPopUp(getEntityWindowCoordinates(entity));
          var removeHandler = viewer.scene.postRender.addEventListener(function () {
            //TODO: Get the height of the entity position via sampleTerrain (or populate height in data)
            var changedC = getEntityWindowCoordinates(entity);
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

function getEntityWindowCoordinates(e) {
  //return Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, e.position.getValue(Cesium.JulianDate.now()));
  return Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, e.position.getValue(viewer.clock.currentTime));
}

function registerChartPlugins() {
  Chart.plugins.register({
    afterDraw: function(chartInstance) {
      if (chartInstance.config.options.showDatapoints) {
        var helpers = Chart.helpers;
        var ctx = chartInstance.chart.ctx;
        var fontColor = helpers.getValueOrDefault(chartInstance.config.options.showDatapoints.fontColor, chartInstance.config.options.defaultFontColor);

        // render the value of the chart above the bar
        ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, 'normal', Chart.defaults.global.defaultFontFamily);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = fontColor;

        chartInstance.data.datasets.forEach(function (dataset) {
          for (var i = 0; i < dataset.data.length; i++) {
            var model = dataset._meta[Object.keys(dataset._meta)[0]].data[i]._model;
            var scaleMax = dataset._meta[Object.keys(dataset._meta)[0]].data[i]._yScale.maxHeight;
            var yPos = (scaleMax - model.y) / scaleMax >= 0.93 ? model.y + 20 : model.y - 5;
            ctx.fillText(dataset.data[i], model.x, yPos);
          }
        });
      }
    }
  });
}
