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

  //ecoregionsLayer = _viewer.imageryLayers.addImageryProvider(config.ecoregionsImageryProvider);
  //_viewer.imageryLayers.lowerToBottom(ecoregionsLayer);
  //_viewer.imageryLayers.raise(ecoregionsLayer);

  //data.getJSONData('data/MTBS/MTBSCZML.json', function(data) {
  data.getJSONData('data/pwildbyeco/ecoregions.json', function(data) {
    ecoregionsData = data;
    console.log(Object.keys(config.ecoRegionColors));
    var ecoregionsLegend = require('../../../data/ecoregions/ecoregionsLegend.json');
    $('#infoPanel').html(ecopwildernessListInfoPanel({
      labels: config.ecoRegionColors
      /*pwild: pwildernessListData.features.sort(function(a, b) {
        var nameA = a.properties.proposedWildernessAreaName.toUpperCase();
        var nameB = b.properties.proposedWildernessAreaName.toUpperCase();
        if (nameA < nameB) {return -1;}
        if (nameA > nameB) {return 1;}
        return 0;
      }) */
    }));

    $('#infoPanelTransparency').change(function() {
      var t=($(this).val())/100;
      //ecoregionsLayer.alpha = t;
    });
    $('#infoPanelTransparency').change();

    // var statsAndCZML = utils.makeCZMLAndStatsForEcoRegions(ecoregionsData);

    Cesium.GeoJsonDataSource.load(data, {clampToGround: true}).then(function(dataSource) {
      /*pwildernessListData.features.forEach(function(pw) {
        console.log(pw.properties.featureCollectionId);
        dataSource.entities.getById(pw.properties.featureCollectionId).label.scaleByDistance = new Cesium.ConstantProperty(
            new Cesium.NearFarScalar(1000, 2, 2e6, 0));
      }); */

      //console.log(dataSource.entities.values);
      dataSource.entities.values.forEach(function(entity) {
        //console.log(entity.properties.eId.getValue(Cesium.JulianDate.now()));

        console.log(entity.name);

        if (!entity.position && entity.polygon) {
          var center = Cesium.BoundingSphere.fromPoints(entity.polygon.hierarchy.getValue().positions).center;
          entity.position = new Cesium.ConstantPositionProperty(center);
        }

        //entity.label = new Cesium.LabelGraphics({text: new Cesium.ConstantProperty(entity.name)});

        entity.polygon.material = (Cesium.Color.fromCssColorString(
          config.ecoRegionColors[entity.name].color)
        ).withAlpha(1);

        console.log(entity.properties.acres);
        if (entity.properties.acres) {
          entity.polygon.extrudedHeight = (entity.properties.acres.getValue(Cesium.JulianDate.now()))/40;
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
          history.pushState('', '', '?view=ecopwilderness&wId=' + id);
          gotoArea(id);
        }
        $('#resetView').click(function() {
          _viewer.camera.flyTo(config.initialCameraView);
          return false;
        });

        var wId = utils.getUrlVars().wId;
        if (wId && isValidwId(wId)) {
          gotoArea(wId);
        } else {
          history.replaceState('', '', '?view=ecopwilderness');
        }

      });
    });

  });

}

export function restoreView() {
  var wId = utils.getUrlVars().wId;
  if (wId && isValidwId(wId)) {
    gotoArea(wId);
  } else {
    if (wId) {
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

function isValidwId(id) {
  var eId = ecoregionsDataSource.features.find(function(f) {
    return f.properties.featureCollectionId === id;
  });
  if (eId) {return true;}
}

function gotoAll() {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
  }
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
  _viewer.dataSources.add(Cesium.GeoJsonDataSource.load('data/pwilderness/' + id + '.json', {clampToGround: true})).then(function(dataSource) {
    savedState.dataSource = dataSource;
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
