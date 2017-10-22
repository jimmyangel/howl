/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './wthreatsConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';
import * as user from '../../../js/user.js';

import * as forms from './wthreatsForms.js';

import wthreatsListInfoPanel from '../templates/wthreatsListInfoPanel.hbs';
import wthreatInfoBox from '../templates/wthreatInfoBox.hbs';
import wthreatsChart from '../templates/wthreatsChart.hbs';

import wthreatsUpdateModal from '../templates/wthreatsUpdateModal.hbs';

import 'magnific-popup/dist/jquery.magnific-popup.min.js';
import 'magnific-popup/dist/magnific-popup.css';

var pinBuilder = new Cesium.PinBuilder();

var _viewer;
var wthreatsDataSource;
var statsAll;
var viewerCallbacks = [];
var wthreatsData;

export function setupView (viewer) {

  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  $('#cesiumContainer').on('dblclick', function(e) {
    //var coord = Cesium.Cartographic.fromCartesian(_viewer.scene.pickPosition(new Cesium.Cartesian2(e.pageX, e.pageY)));
    var coord = Cesium.Cartographic.fromCartesian(_viewer.scene.globe.pick(_viewer.camera.getPickRay(new Cesium.Cartesian2(e.pageX, e.pageY - 50)), _viewer.scene));
    //var coord = Cesium.Cartographic.fromCartesian(_viewer.camera.pickEllipsoid(new Cesium.Cartesian2(e.pageX, e.pageY)));
    if (utils.locationPickEnabled) {
      reopenUpdateThreatInfoDialog(coord);
    } else {
      updateThreatInfoDialog(null, coord);
    }
    return false;
  });

  $(_viewer._timeline.container).css('visibility', 'hidden');
  //$(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  statsAll = {};

  data.getJSONData(user.getDataPath() + config.githubData.file, function(gContents) {
    wthreatsData = JSON.parse(utils.b64DecodeUnicode(gContents.content));
    refreshView();
  });
}

function refreshView() {
  return new Promise(function (resolve) {
    var tcount = 0;
    wthreatsData.features.forEach(function(feature) {
      feature.properties['marker-color'] = config.markerStyles[feature.properties.threatType].color;
      feature.properties['marker-symbol'] = config.markerStyles[feature.properties.threatType].icon;
      if (statsAll[feature.properties.threatType]) {
        statsAll[feature.properties.threatType]++;
      } else {
        statsAll[feature.properties.threatType] = 1;
      }
      tcount++;
    });

    // Generate pins for the legend
    var p = []
    for (var key in config.markerStyles) {
      (function() {
        p.push(
          Cesium.when(
            pinBuilder.fromMakiIconId(config.markerStyles[key].icon, Cesium.Color.fromCssColorString(config.markerStyles[key].color), 30),
            function(canvas) {
              return canvas.toDataURL();
          })
        );
      })(key);
    }
    // When all the pins are ready, go ahead and continue
    Cesium.when.all(p, function(pins) {
      var i = 0;
      for (var key in config.markerStyles) {
        config.markerStyles[key].pinDataUrl = pins[i++];
      }

      $('#summaryChartContainer').html(wthreatsChart({tcount: tcount}));
      setUpSummaryChart();

      $('#infoPanel').html(wthreatsListInfoPanel({
        markerStyles: config.markerStyles,
        threats: wthreatsData.features,
        pinDataUrl: pinBuilder.fromText('?', Cesium.Color.BLACK, 42).toDataURL()
      }));

      Cesium.GeoJsonDataSource.load(wthreatsData).then(function(dataSource) {
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
            material: (Cesium.Color.fromCssColorString(config.markerStyles[wthreatsData.features[idx].properties.threatType].color)).withAlpha(0.6)
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
            getEntityForItemName($(this).text()).then(function(entity) {
              selectItem(entity);
            });
          });

          $('.v-legend-item-sel').on('contextmenu', function() {
            document.getSelection().removeAllRanges();
            updateThreatInfoDialog($(this).text());
            return false;
          });

          resolve();

        });
      });
    });
  });
}

function updateThreatInfoDialog(selected, coord) {
  if (user.currentUser) {
    var threatsItem;
    if (selected) {
      var idx = wthreatsData.features.findIndex(function(f) {
        return f.properties.threatName === selected;
      });
      $.each(config.markerStyles, function(key, value){delete value.selected});
      config.markerStyles[wthreatsData.features[idx].properties.threatType].selected = true;
      threatsItem = wthreatsData.features[idx];
    } else {
      threatsItem = {
        geometry: {
          coordinates: [
            ((180 * coord.longitude)/Math.PI).toFixed(4),
            ((180 * coord.latitude)/Math.PI).toFixed(4)
          ]
        }
      }
    }
    utils.disableLocationPickMode();
    $('#updateModal').html(wthreatsUpdateModal({threatsItem: threatsItem, threatSelect: config.markerStyles}));
    if (idx === undefined) {
       $('#threat-remove-form-group').hide();
       $('#newThreatRecord').show();
    }
    $('#commitButton').attr('disabled', true);
    $('#wthreatsUpdateModalForm :input').change(function() {
      $('#commitButton').attr('disabled', false);
    });
    $('#commitButton').click(function() {
      if (!($('#commitButton').is['disabled']) && forms.isValidForm('wthreatUpdate')) {
        $('#updateModal').modal('hide');
        commitDocument(idx);
      }
      return false;
    });
    $('#pickLocationButton').click(function() {
      $('#updateModal').modal('hide');
      utils.enableLocationPickMode();
      return false;
    });
    $('#updateModal').modal('show');
  }
}

function reopenUpdateThreatInfoDialog(coord) {
  utils.disableLocationPickMode();
  $('#updateModal').modal('show');
  $('#threat-lon').val(((180 * coord.longitude)/Math.PI).toFixed(4));
  $('#threat-lat').val(((180 * coord.latitude)/Math.PI).toFixed(4));
  $('#wthreatsUpdateModalForm :input').change();
}

function commitDocument(idx) {
  if (idx === undefined) {
    idx = wthreatsData.features.push({properties: {}, type: 'Feature', geometry: {type: 'Point', coordinates: [0, 0]}}) - 1;
  }

  var commitMessage;
  var itemRemoved = false;
  if ($('#threat-remove').is(":checked")) {
    commitMessage = 'Removed ' + wthreatsData.features[idx].properties.threatName;
    wthreatsData.features.splice(idx, 1);
    itemRemoved = true;
  } else {
    commitMessage = 'Update ' + wthreatsData.features[idx].properties.threatName;
    wthreatsData.features[idx].properties['threatName'] = $('#threat-name').val();
    wthreatsData.features[idx].properties['threatType'] = $('#threat-type').val();
    wthreatsData.features[idx].properties['threatDescription'] = $('#threat-description').val();
    wthreatsData.features[idx].geometry['coordinates'][0] = $('#threat-lon').val();
    wthreatsData.features[idx].geometry['coordinates'][1] = $('#threat-lat').val();
    wthreatsData.features[idx].properties['threatImgUrl'] = $('#threat-img-url').val();
    wthreatsData.features[idx].properties['threatImgCredit'] = $('#threat-img-credit').val();
    wthreatsData.features[idx].properties['threatUrlReferences'] = [];
    if ($('#threat-info-url-1').val()) {
      wthreatsData.features[idx].properties['threatUrlReferences'].push({url: $('#threat-info-url-1').val(), urlTitle: $('#threat-info-url-title-1').val()});
    }
    if ($('#threat-info-url-2').val()) {
      wthreatsData.features[idx].properties['threatUrlReferences'].push({url: $('#threat-info-url-2').val(), urlTitle: $('#threat-info-url-title-2').val()});
    }
  }

  var repo = user.getRepo();

  repo.writeFile(config.githubData.branch, config.githubData.file, JSON.stringify(wthreatsData, null, 2), commitMessage, {encode: true}).then(function() {
    wipeoutView();
    refreshView().then(function() {
      if (!itemRemoved) {
        getEntityForItemName(wthreatsData.features[idx].properties['threatName']).then(function(entity) {
          selectItem(entity);
        });
      }
    });
  }, function(error) {
    console.log('commit error', error);
  });
}

function getEntityForItemName(itemName) {
  return new Promise(function (resolve, reject) {
    wthreatsDataSource.entities.values.forEach(function(entity) {
      if (entity.properties.threatName.getValue() == itemName) {
        _viewer.selectedEntity = entity;
        resolve(entity);
      }
    });
    // This should never happen
    reject('entity not found');
  });
}

function selectItem(e) {
  if (e && e.properties.threatType) {
    $('#infoBox').html(wthreatInfoBox(
      {
        threatName: e.properties.threatName,
        threatImgUrl: e.properties.threatImgUrl,
        threatImgCredit: e.properties.threatImgCredit,
        threatType: config.markerStyles[e.properties.threatType.getValue()].legend,
        threatDescription: e.properties.threatDescription,
        threatUrlReferences: e.properties.threatUrlReferences.getValue()
      }
    ));

    if (e.properties.threatImgUrl) {
      $('.wthreat-photo').click(function() {
        $(this).blur();
        return false;
      });

      $('.wthreat-photo img').on('error', function() {
        $('#wthreatImageContainer').hide();
      });

      $('.wthreat-photo').magnificPopup({
        type: 'image',
        closeOnContentClick: true,
        mainClass: 'mfp-img-mobile',
        image: {
          verticalFit: true
        }
      });
    }

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
  utils.disableLocationPickMode();
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
