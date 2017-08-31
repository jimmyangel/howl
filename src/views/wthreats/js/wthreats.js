/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './wthreatsConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';

import wthreatsListInfoPanel from '../templates/wthreatsListInfoPanel.hbs';
import wthreatInfoBox from '../templates/wthreatInfoBox.hbs';
import wthreatsChart from '../templates/wthreatsChart.hbs';


var _viewer;
var wthreatsDataSource;
var statsAll;
var viewerCallbacks = [];

export function setupView (viewer) {
  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  $(_viewer._timeline.container).css('visibility', 'hidden');
  //$(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  statsAll = {};

  data.getJSONData(config.dataPaths.wthreatsList, function(data) {

    var tcount = 0;
    data.features.forEach(function(feature) {
      feature.properties['marker-color'] = config.markerStyles[feature.properties.threatType].color;
      feature.properties['marker-symbol'] = config.markerStyles[feature.properties.threatType].icon;
      if (statsAll[feature.properties.threatType]) {
        statsAll[feature.properties.threatType]++;
      } else {
        statsAll[feature.properties.threatType] = 1;
      }
      tcount++;
    });

    $('#summaryChartContainer').html(wthreatsChart({tcount: tcount}));
    setUpSummaryChart();

    $('#infoPanel').html(wthreatsListInfoPanel({
      markerStyles: config.markerStyles,
      threats: data.features
    }));

    Cesium.GeoJsonDataSource.load(data).then(function(dataSource) {
      wthreatsDataSource = dataSource;

      wthreatsDataSource.entities.values.forEach(function(entity, idx) {
        if (entity.billboard) {
          entity.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
          entity.billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
        }
        entity.ellipse = new Cesium.EllipseGraphics({
          semiMajorAxis: 5000,
          semiMinorAxis: 5000,
          //distanceDisplayCondition: new Cesium.DistanceDisplayCondition(1000),
          material: (Cesium.Color.fromCssColorString(config.markerStyles[data.features[idx].properties.threatType].color)).withAlpha(0.6)
        });

      });

      _viewer.dataSources.add(wthreatsDataSource).then(function() {
        window.spinner.stop();
        viewdispatcher.cleanUrl();
        utils.setUpResetView(_viewer);
        $('#resetView').click();
        setUpInfoBox();

        $('#hide-circles-option').change(function() {
          var hideCircles = $(this).is(":checked");
          wthreatsDataSource.entities.values.forEach(function(entity) {
            if (entity.ellipse) {
              entity.ellipse.show = !hideCircles;
            }
          });
        });

        $('.v-legend-item-sel').click(function() {
          var selected = $(this).text();
          wthreatsDataSource.entities.values.forEach(function(entity) {
            if (entity.properties.threatName.getValue() == selected) {
              _viewer.selectedEntity = entity;
              selectItem(entity);
            }
          });
        });
      });
    });

  });

}

function selectItem(e) {
  if (e && e.properties.threatType) {
    $('#infoBox').html(wthreatInfoBox(
      {
        threatName: e.properties.threatName,
        threatType: config.markerStyles[e.properties.threatType.getValue()].legend,
        threatDescription: e.properties.threatDescription,
        threatUrlReferences: e.properties.threatUrlReferences.getValue()
      }
    ));
    showInfoBox();
    _viewer.flyTo(e, {offset: new Cesium.HeadingPitchRange(0, -(Math.PI / 4), 50000)});
  } else {
    _viewer.selectedEntity = undefined;
    hideInfoBox();
  }
}

function setUpInfoBox() {

  // Add selected entity listener to open/close info box
  viewerCallbacks.push(_viewer.selectedEntityChanged.addEventListener(selectItem));
}

function showInfoBox() {
  $('#infoBox').animate({'margin-right': 0, opacity: 0.8}, 200);
}

function hideInfoBox() {
  $('#infoBox').animate({'margin-right': '-30%', opacity: 0}, 200);
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
  //_viewer.scene.globe.depthTestAgainstTerrain = false;
  viewerCallbacks.forEach(function(removeCallback) {
    if (removeCallback) {
       removeCallback();
    }
  });
}

function setUpSummaryChart() {
  var labels = [];
  var colors = [];
  var data = [];

  $.each(config.markerStyles, function(key, style) {
    labels.push(style.legend);
    colors.push(style.color);

    data.push(statsAll[key]);
  });

  var ctx = $('#summaryChart')[0];

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        backgroundColor: colors,
        data: data
      }]
    },
    options: {
      legend: {
        position: 'bottom'
      }
    }
  });

}
