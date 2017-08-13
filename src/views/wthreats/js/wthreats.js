/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './wthreatsConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';

import wthreatsListInfoPanel from '../templates/wthreatsListInfoPanel.hbs';

var _viewer;
var wthreatsDataSource;
var statsAll = {};

export function setupView (viewer) {
  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  $(_viewer._timeline.container).css('visibility', 'hidden');
  //$(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  _viewer.scene.globe.depthTestAgainstTerrain = true;

  data.getJSONData(config.dataPaths.wthreatsList, function(data) {

    data.features.forEach(function(feature) {
      feature.properties['marker-color'] = config.markerStyles[feature.properties.threatType].color;
      feature.properties['marker-symbol'] = config.markerStyles[feature.properties.threatType].icon;
    });

    $('#infoPanel').html(wthreatsListInfoPanel({

    }));

    Cesium.GeoJsonDataSource.load(data).then(function(dataSource) {
      wthreatsDataSource = dataSource;

      wthreatsDataSource.entities.values.forEach(function(entity) {
        if (entity.billboard) {
          entity.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
          entity.billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
          console.log(entity);
        }

      });

      _viewer.dataSources.add(wthreatsDataSource).then(function() {
        window.spinner.stop();
        viewdispatcher.cleanUrl();
        utils.setUpResetView(_viewer);
        $('#resetView').click();
      });
    });

  });

}


export function restoreView() {

}

export function wipeoutView() {
  $('#resetView').off();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(wthreatsDataSource, true);
  wthreatsDataSource =  undefined;
  _viewer.scene.globe.depthTestAgainstTerrain = false;
}

function setUpSummaryChart() {

}
