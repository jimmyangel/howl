/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';
import * as data from '../data.js';
import * as utils from '../utils.js';

import ecopwildernessListInfoPanel from '../../templates/ecopwilderness/ecopwildernessListInfoPanel.hbs';
import ecopwildernessInfoPanel from '../../templates/ecopwilderness/ecopwildernessInfoPanel.hbs';
import ecopwildernessChart from '../../templates/ecopwilderness/ecopwildernessChart.hbs';


var ecoregionsData;
var _viewer;
var ecoregionsDataSource;
var savedState;
var statsAll = {totalAcres: 0};

export function setupView (viewer) {
  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  $(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  data.getJSONData(config.dataPaths.ecoregions, function(data) {
    ecoregionsData = data;
    var l = window.navigator.language;
    var o = {maximumFractionDigits: 0};
    var p = {style: 'percent', maximumFractionDigits: 1}
    statsAll.totalAcres = ecoregionsData.features.reduce(function(acc, feature) {
      return acc + parseInt(feature.properties.acres ? feature.properties.acres : 0);
    }, 0);

    $('#summaryChartContainer').html(ecopwildernessChart({acres: ((statsAll.totalAcres/1000)).toLocaleString(window.navigator.language, {maximumFractionDigits: 0})}));
    setUpSummaryChart();

    ecoregionsData.features.forEach(function (feature) {
      var acres = parseInt(feature.properties.acres ? feature.properties.acres : 0);
      // TODO: replace the below with a local data structure, not config
      config.ecoRegionColors[feature.properties.US_L3NAME].acres = acres.toLocaleString(l, o);
      config.ecoRegionColors[feature.properties.US_L3NAME].percent = (acres / statsAll.totalAcres).toLocaleString(l, p)
    });

    Cesium.GeoJsonDataSource.load(data).then(function(dataSource) {
      ecoregionsDataSource = dataSource;
      ecoregionsDataSource.show = false;

      ecoregionsDataSource.entities.values.forEach(function(entity) {
        var eHeight = 0;

        if (entity.properties.acres) {
          eHeight = entity.properties.acres.getValue()/40;
        }
        entity.polygon.closeBottom = false;
        entity.polygon.closeTop = true;
        entity.polygon.show = false;

        entity.polygon.extrudedHeight = eHeight;

        if (!entity.position && entity.polygon) {
          var pos = entity.polygon.hierarchy.getValue().positions;
          if (config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].lat) {
            entity.position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(
              config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].lon,
              config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].lat
            ));
          } else {
            var center = Cesium.BoundingSphere.fromPoints(pos).center;
            entity.position = new Cesium.ConstantPositionProperty(center);
          }

          var labelText = config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].label.toUpperCase().replace(/ /g, '\n');
          if (config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].acres != 0) {
            labelText += '\n('+ config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].acres + 'A ' +
              config.ecoRegionColors[entity.properties.US_L3NAME.getValue()].percent + ')';
          } else {
            entity.properties.addProperty('doNotPick', true);
          }
          if (pos.length > 100) {
            entity.label = new Cesium.LabelGraphics(
            {
              text: labelText,
              font: new Cesium.ConstantProperty('14px sans-serif'),
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              scaleByDistance: new Cesium.ConstantProperty(new Cesium.NearFarScalar(2e5, 2, 1.8e6, 0.1))
            });
          }

          entity.corridor = new Cesium.CorridorGraphics(
          {
            positions: pos,
            width: 4000,
            extrudedHeight: eHeight
          });
        }
      });

      _viewer.dataSources.add(dataSource).then(function() {
        window.spinner.stop();

        viewdispatcher.popUpLinkClickHandler = function(id) {
          var eId = ecoregionsDataSource.entities.getById(id).properties.eId.getValue();
          this.inViewDispatch(gotoArea.bind(this, eId) , '?view=ecopwilderness&eId=' + eId);
        }
        utils.setUpResetView(_viewer, config.initialCameraView);

        var eId = utils.getUrlVars().eId;
        if (eId && isValideId(eId)) {
          gotoArea(eId);
        } else {
          viewdispatcher.cleanUrl();
          gotoAll();
        }

      });
    });

  });

}

function colorizeDataSourceEntities(dataSource, alpha, id) {
  dataSource.entities.values.forEach(function(entity) {

    entity.polygon.material = (Cesium.Color.fromCssColorString(
      config.ecoRegionColors[((id) ? getEcoregionNameForId(id) : entity.name)].color)
    ).withAlpha(alpha);

    if (entity.corridor) {
      entity.corridor.material = (Cesium.Color.fromCssColorString(
        config.ecoRegionColors[((id) ? getEcoregionNameForId(id) : entity.name)].color)
      ).withAlpha(1);
    }

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
      viewdispatcher.cleanUrl();
    }
    gotoAll();
  }
}

export function wipeoutView() {
  $('#resetView').off();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(ecoregionsDataSource, true);
  cleanupDrillDown();
  ecoregionsData = ecoregionsDataSource = savedState = undefined;

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
  colorizeDataSourceEntities(ecoregionsDataSource, 1);
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
  }
  ecoregionsDataSource.show = true;
  utils.setUpResetView(_viewer, config.initialCameraView);

  // This is a bit of hack because flyTo is not working from here
  $('#resetView').click();
}

function gotoArea(id) {
  window.spinner.spin($('#spinner')[0]);

  cleanupDrillDown()
  savedState = {};
  $('.leaflet-popup-close-button').click();

  _viewer.dataSources.add(Cesium.GeoJsonDataSource.load(config.dataPaths.pwilderness + id + '.json',
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
    });

    displayEcoregionBoundary(id);

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

    window.spinner.stop();
    _viewer.flyTo(dataSource);
    utils.setUpResetView(_viewer, dataSource);
  });
}

function displayEcoregionBoundary(id) {
  savedState.boundaryEntities = [];
  ecoregionsDataSource.entities.values.forEach(function(entity) {
    if (entity.corridor && entity.name === getEcoregionNameForId(id)) {
      savedState.boundaryEntities.push(_viewer.entities.add({
        name: entity.name,
        properties: {
          doNotPick: true
        },
        corridor: {
          positions: entity.corridor.positions,
          width: 800,
          material: (Cesium.Color.fromCssColorString('#000000')).withAlpha(0.8)
        }
      }));
    }
  });
}

function cleanupDrillDown() {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
    savedState.boundaryEntities.forEach(function(boundaryEntity) {
      _viewer.entities.remove(boundaryEntity, true);
    });
  }
}

function setUpSummaryChart() {
  var labels = [];
  var colors = [];
  var data = [];
  var all = [];

  for (var i=0; i<ecoregionsData.features.length; i++) {
    if (ecoregionsData.features[i].properties.acres) {
      all.push({
        labels: config.ecoRegionColors[ecoregionsData.features[i].properties.US_L3NAME].label,
        colors: config.ecoRegionColors[ecoregionsData.features[i].properties.US_L3NAME].color,
        data: (ecoregionsData.features[i].properties.acres/1000).toFixed(2)
      });
    }
  }

  all.sort(function(a, b) {
    return b.data - a.data;
  });

  all.forEach(function(item) {
    labels.push(item.labels);
    colors.push(item.colors);
    data.push(item.data);
  });

  var ctx = $('#summaryChart')[0];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        backgroundColor: colors,
        data: data
      }]
    },
    options: {
      showDatapoints: true,
      tooltips: {
        enabled: false
      },
      title: {
        display: false
      },
      legend: {
        display: false
      },
      scales: {
        yAxes:
        [
          {
            ticks: {beginAtZero:true},
            scaleLabel: {
              display: true,
              labelString: 'Area (in thousands of acres)'
            }
          }
        ]
      }
    }
  });
}
