/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';

import ecopwildernessListInfoPanel from '../../templates/pwilderness/ecopwildernessListInfoPanel.hbs';
import ecopwildernessInfoPanel from '../../templates/pwilderness/ecopwildernessInfoPanel.hbs';

var ecoregionsData;
var _viewer;
var ecoregionsDataSource;
var ecoregionsLayer
var savedState;
var statsAll = {totalAcres: 0};

export function setupView (viewer) {
  $('#viewContainer').show();
  _viewer = viewer;

  $(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  data.getJSONData('data/pwildbyeco/ecoregions.json', function(data) {
    ecoregionsData = data;
    var l = window.navigator.language;
    var o = {maximumFractionDigits: 0};
    var p = {style: 'percent', maximumFractionDigits: 1}
    statsAll.totalAcres = ecoregionsData.features.reduce(function(acc, feature) {
      return acc + parseInt(feature.properties.acres ? feature.properties.acres : 0);
    }, 0);

    ecoregionsData.features.forEach(function (feature) {
      //console.log(config.ecoRegionColors[feature.properties.US_L3NAME], feature.properties.acres);
      var acres = parseInt(feature.properties.acres ? feature.properties.acres : 0);
      config.ecoRegionColors[feature.properties.US_L3NAME].acres = acres.toLocaleString(l, o);
      config.ecoRegionColors[feature.properties.US_L3NAME].percent = (acres / statsAll.totalAcres).toLocaleString(l, p)
    });

    Cesium.GeoJsonDataSource.load(data).then(function(dataSource) {
      ecoregionsDataSource = dataSource;
      ecoregionsDataSource.show = false;

      ecoregionsDataSource.entities.values.forEach(function(entity) {
        if (!entity.position && entity.polygon) {
          var center = Cesium.BoundingSphere.fromPoints(entity.polygon.hierarchy.getValue().positions).center;
          entity.position = new Cesium.ConstantPositionProperty(center);
        }

        if (entity.properties.acres) {
          entity.polygon.closeBottom = true;
          entity.polygon.closeTop = true;
          entity.polygon.extrudedHeight = (entity.properties.acres.getValue())/40;
        }
      });

      $('#loadingIndicator').hide();

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
          gotoAll();
        }

      });
    });

  });

}

function colorizeEcoregions(alpha) {
  ecoregionsDataSource.entities.values.forEach(function(entity) {

    entity.polygon.material = (Cesium.Color.fromCssColorString(
      config.ecoRegionColors[entity.name].color)
    ).withAlpha(alpha);

    entity.polygon.outlineWidth = 0;
    entity.polygon.outlineColor = (Cesium.Color.fromCssColorString(
      config.ecoRegionColors[entity.name].color)
    ).withAlpha(alpha);
  });
}

function colorizeDataSourceEntities(dataSource, alpha, id) {
  dataSource.entities.values.forEach(function(entity) {

    entity.polygon.material = (Cesium.Color.fromCssColorString(
      config.ecoRegionColors[((id) ? getEcoregionNameForId(id) : entity.name)].color)
    ).withAlpha(alpha);

    entity.polygon.outlineWidth = 0;
    entity.polygon.outlineColor = (Cesium.Color.fromCssColorString(
      config.ecoRegionColors[((id) ? getEcoregionNameForId(id) : entity.name)].color)
    ).withAlpha(alpha);
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

function getEcoregionNameForId(id) {
  var feature = ecoregionsData.features.find(function(f) {
    return f.properties.eId === id;
  });
  return feature.properties.US_L3NAME;
}

function gotoAll() {
  $('.leaflet-popup-close-button').click();
  $('#infoPanel').html(ecopwildernessListInfoPanel({
    labels: config.ecoRegionColors
  }));
  $('#infoPanelTransparency').change(function() {
    var t=($(this).val())/100;
    colorizeDataSourceEntities(ecoregionsDataSource, t);
  });
  $('#infoPanelTransparency').change();
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

  _viewer.dataSources.add(Cesium.GeoJsonDataSource.load('data/pwildbyeco/' + id + '.json',
    {
      clampToGround: true
    })).then(function(dataSource) {
    savedState.dataSource = dataSource;
    ecoregionsDataSource.show = false;
    var units = [];
    dataSource.entities.values.forEach(function(entity) {

      if (!entity.position && entity.polygon) {
        var center = Cesium.BoundingSphere.fromPoints(entity.polygon.hierarchy.getValue().positions).center;
        entity.position = new Cesium.ConstantPositionProperty(center);
      }
      var entry = entity.properties.AREA_NAMES.getValue() + ' (' + entity.properties.Acres.getValue().toLocaleString(window.navigator.language, {maximumFractionDigits: 0}) + ' Acres)';
      if (!units.includes(entry)) {
        units.push(entry);
      }
      //entity.polygon.extrudedHeight = 4000;
    });
    console.log(units);
    $('#infoPanel').html(ecopwildernessInfoPanel({
      singleLabel: config.ecoRegionColors[getEcoregionNameForId(id)],
      labels: config.ecoRegionColors,
      units: units.sort()
    }));

    $('#infoPanelTransparency').change(function() {
      var t=($(this).val())/100;
      colorizeDataSourceEntities(dataSource, t, id);
    });
    $('#infoPanelTransparency').change();

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
