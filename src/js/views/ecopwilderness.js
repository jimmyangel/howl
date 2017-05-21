/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';

import ecopwildernessListInfoPanel from '../../templates/pwilderness/ecopwildernessListInfoPanel.hbs';

var ecoregionsData;
var statsAll;
var _viewer;
var ecoregionsDataSource;
var ecoregionsLayer
var savedState;

export function setupView (viewer) {
  $('#viewContainer').show();
  _viewer = viewer;

  $(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  //_viewer.terrainProvider = new Cesium.CesiumTerrainProvider({url : 'https://assets.agi.com/stk-terrain/world'});
  //viewer.scene.globe.depthTestAgainstTerrain = true;

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  data.getJSONData('data/pwildbyeco/ecoregions.json', function(data) {
    ecoregionsData = data;
    console.log(Object.keys(config.ecoRegionColors));
    var ecoregionsLegend = require('../../../data/ecoregions/ecoregionsLegend.json');
    $('#infoPanel').html(ecopwildernessListInfoPanel({
      labels: config.ecoRegionColors
    }));

    $('#infoPanelTransparency').change(function() {
      var t=($(this).val())/100;
      //ecoregionsLayer.alpha = t;
    });
    $('#infoPanelTransparency').change();


    Cesium.GeoJsonDataSource.load(data, {clampToGround: true}).then(function(dataSource) {

      dataSource.entities.values.forEach(function(entity) {
        if (!entity.position && entity.polygon) {
          var center = Cesium.BoundingSphere.fromPoints(entity.polygon.hierarchy.getValue().positions).center;
          entity.position = new Cesium.ConstantPositionProperty(center);
        }

        entity.polygon.material = (Cesium.Color.fromCssColorString(
          config.ecoRegionColors[entity.name].color)
        ).withAlpha(1);

        console.log(entity.properties.acres);
        if (entity.properties.acres) {
          entity.polygon.extrudedHeight = (entity.properties.acres.getValue())/40;
        }
        entity.polygon.outlineWidth = 0;
        entity.polygon.outlineColor = (Cesium.Color.fromCssColorString(
          config.ecoRegionColors[entity.name].color)
        ).withAlpha(0);
      });

      $('#loadingIndicator').hide();
      ecoregionsDataSource = dataSource;

      _viewer.dataSources.add(dataSource).then(function() {

        viewdispatcher.popUpLinkClickHandler = function(id) {
          var eId = ecoregionsDataSource.entities.getById(id).properties.eId.getValue();
          history.pushState('', '', '?view=ecopwilderness&eId=' + eId);
          gotoArea(eId);
        }
        $('#resetView').click(function() {
          _viewer.camera.flyTo(config.initialCameraView);
          return false;
        });

        var eId = utils.getUrlVars().eId;
        if (eId && isValideId(eId)) {
          gotoArea(eId);
        } else {
          history.replaceState('', '', '?view=ecopwilderness');
        }

      });
    });

  });

}

export function restoreView() {
  var eId = utils.getUrlVars().eId;
  if (eId && isValideId(eId)) {
    gotoArea(eId);
  } else {
    if (eId) {
      // This means invalid id and back button, so get rid of it
      history.replaceState('', '', '?view=ecopwilderness');
    }
    gotoAll();
  }
}

export function wipeoutView() {
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(ecoregionsDataSource, true);
  //_viewer.imageryLayers.remove(ecoregionsLayer);
}

function isValideId(id) {
  var eId = ecoregionsData.features.find(function(f) {
    return f.properties.eId === id;
  });
  if (eId) {return true;}
}

function gotoAll() {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
  }
  ecoregionsDataSource.show = true;
  $('#resetView').click(function() {
    _viewer.flyTo(config.initialCameraView);
    return false;
  });

  // This is a bit of hack because flyTo is not working from here
  $('#resetView').click();
}

function gotoArea(id) {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
  }
  savedState = {};
  $('.leaflet-popup-close-button').click();
  _viewer.dataSources.add(Cesium.GeoJsonDataSource.load('data/pwildbyeco/' + id + '.json', {clampToGround: true})).then(function(dataSource) {
    savedState.dataSource = dataSource;

    ecoregionsDataSource.show = false;
    $('#loadingIndicator').hide();
    _viewer.flyTo(dataSource);
    $('#resetView').click(function() {
      _viewer.flyTo(dataSource);
      return false;
    });
  });
}

function setUpSummaryChart() {

}
