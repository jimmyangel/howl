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

import 'magnific-popup/dist/jquery.magnific-popup.min.js';
import 'magnific-popup/dist/magnific-popup.css';

import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

var _viewer;
var wthreatsDataSource;
var statsAll;
var viewerCallbacks = [];

var firebaseDatabase = firebase.database();
console.log(firebaseDatabase);
//firebase.auth().signOut();
firebase.auth().signInWithEmailAndPassword('morinricardo@gmail.com', 'password').catch(function(error) {
  console.log(error.code, error.message);
});
/*firebase.database().ref('/wthreats').once('value').then(function(snapshot) {
  console.log(snapshot.val());
}); */

export function setupView (viewer) {
  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  $('#cesiumContainer').on('contextmenu', function(e) {
    console.log(firebase.auth().currentUser);
    if (firebase.auth().currentUser) {
      var pickItem = _viewer.scene.pick(new Cesium.Cartesian2(e.pageX, e.pageY));
      if (pickItem) {
        console.log('right click', e.pageX, e.pageY, pickItem.id.properties.threatName.getValue());
      }
    } else {
      console.log('Not logged on');
    }
    return false;
  });

  $(_viewer._timeline.container).css('visibility', 'hidden');
  //$(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  statsAll = {};

  //data.getJSONData(config.dataPaths.wthreatsList, function(data) {
  firebase.database().ref('/wthreats').once('value').then(function(snapshot) {
    var data = snapshot.val();
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
