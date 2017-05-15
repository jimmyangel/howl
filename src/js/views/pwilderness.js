/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';

import pwildernessListInfoPanel from '../../templates/pwilderness/pwildernessListInfoPanel.hbs';

var pwildernessListData;
var statsAll;
var _viewer;
var pwildernessListDataSource;
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

  ecoregionsLayer = _viewer.imageryLayers.addImageryProvider(config.ecoregionsImageryProvider);
  _viewer.imageryLayers.lowerToBottom(ecoregionsLayer);
  _viewer.imageryLayers.raise(ecoregionsLayer);

  //data.getJSONData('data/MTBS/MTBSCZML.json', function(data) {
  data.getJSONData('data/pwilderness/Windex.json', function(data) {
    pwildernessListData = data;
    var ecoregionsLegend = require('../../../data/ecoregions/ecoregionsLegend.json');
    $('#infoPanel').html(pwildernessListInfoPanel({
      eLegend: ecoregionsLegend.layers[0],
      pwild: pwildernessListData.features.sort(function(a, b) {
        var nameA = a.properties.proposedWildernessAreaName.toUpperCase();
        var nameB = b.properties.proposedWildernessAreaName.toUpperCase();
        if (nameA < nameB) {return -1;}
        if (nameA > nameB) {return 1;}
        return 0;
      })
    }));

    $('#infoPanelTransparency').change(function() {
      var t=($(this).val())/100;
      ecoregionsLayer.alpha = t;
    });
    $('#infoPanelTransparency').change();

    var statsAndCZML = utils.makeCZMLAndStatsForListOfpwilderness(pwildernessListData);

    Cesium.CzmlDataSource.load(statsAndCZML.czml).then(function(dataSource) {
      /*pwildernessListData.features.forEach(function(pw) {
        console.log(pw.properties.featureCollectionId);
        dataSource.entities.getById(pw.properties.featureCollectionId).label.scaleByDistance = new Cesium.ConstantProperty(
            new Cesium.NearFarScalar(1000, 2, 2e6, 0));
      }); */

      $('#loadingIndicator').hide();
      pwildernessListDataSource = dataSource;

      _viewer.dataSources.add(dataSource).then(function() {

        viewdispatcher.popUpLinkClickHandler = function(id) {
          console.log('popUp click', id);
        }
        $('#resetView').click(function() {
          _viewer.camera.flyTo(config.initialCameraView);
          return false;
        });

      });
    });

  });

}

export function restoreView() {

}

export function wipeoutView() {
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(pwildernessListDataSource, true);
  _viewer.imageryLayers.remove(ecoregionsLayer);
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
