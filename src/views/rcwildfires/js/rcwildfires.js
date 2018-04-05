/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './rcwildfiresConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';
import * as user from '../../../js/user.js';

import rcwildfiresListInfoPanel from '../templates/rcwildfiresListInfoPanel.hbs';
import rcwildfireInfoPanel from '../templates/rcwildfireInfoPanel.hbs';
import rcwildfiresChart from '../templates/rcwildfiresChart.hbs';

import 'magnific-popup/dist/jquery.magnific-popup.min.js';
import 'magnific-popup/dist/magnific-popup.css';

var pinBuilder = new Cesium.PinBuilder();

var _viewer;
var statsAll;
var rcwildfireListData;
var clockViewModel;
var animationViewModel;
var rcwildfireListDataSource;
var savedState;

export function setupView (viewer) {

  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;
  clockViewModel = new Cesium.ClockViewModel(_viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);

  _viewer.timeline.makeLabel = function(date) {
    var jDate = Cesium.JulianDate.toDate(date);
    return jDate.getMonth() + '/' + jDate.getDate() + '/' + jDate.getFullYear();
  };

  $(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  statsAll = {};

  data.getJSONData(config.dataPaths.rcwildfiresList, function(data) {
    rcwildfireListData = data;

    Cesium.CzmlDataSource.load(makeCZMLAndStatsForListOfRcfires(rcwildfireListData)).then(function(dataSource) {
      rcwildfireListDataSource = dataSource;
      rcwildfireListDataSource.show = false;

      _viewer.dataSources.add(dataSource).then(function() {

        console.log('epa', rcwildfireListDataSource);

        window.spinner.stop();
        viewdispatcher.popUpLinkClickHandler = function(id) {
          this.inViewDispatch(gotoFire.bind(this, id) , '?view=rcwildfires&fId=' + id);
        }

        var fId = utils.getUrlVars().fId;
        if (fId && isValidId(fId)) {
          gotoFire(fId);
        } else {
          viewdispatcher.cleanUrl();
          gotoAll();
        }
      });
    });
  });
}

function makeCZMLAndStatsForListOfRcfires (rcwildfireListData) {
  var rcwildfiresCZML = [
    {
      id: 'document',
      name: 'rcwildfires',
      version: "1.0",
    }
  ];
  rcwildfireListData.forEach(function (f) {
    var pathToFlameIcon = require('../../../images/flame.png');
    var czmlItem = {
      id: f.fireFileName,
      name: f.fireName,
      billboard: {
        image : pathToFlameIcon,
        verticalOrigin: 'BOTTOM',
        heightReference: 'CLAMP_TO_GROUND',
        //scale: 0.05,
        scaleByDistance: {
          nearFarScalar: [2e4, 0.1, 1.8e6, 0.005]
        }
      },
      position: {
        cartographicDegrees: [f.location[0], f.location[1], 1000]
      },
      properties: {
        howlHasFeaturePopUp: true
      }
    };
    rcwildfiresCZML.push(czmlItem);
  });
  return rcwildfiresCZML;
}

function selectItem(e) {

}

export function restoreView() {
  var fId = utils.getUrlVars().fId;
  if (fId && isValidId(fId)) {
    gotoFire(fId);
  } else {
    if (fId) {
      // This means invalid id and back button, so get rid of it
      viewdispatcher.cleanUrl();
    }
    gotoAll();
  }
}

function gotoAll() {
  console.log('gotoAll');
  $('#infoPanel').html(rcwildfiresListInfoPanel({
    listOfFires: rcwildfireListData
  }));
  $('.rcwildfires-list-item').click(function() {
    console.log('hey', $(this).attr('data-fireFileName'));
    var id = $(this).attr('data-fireFileName');
    viewdispatcher.inViewDispatch(gotoFire.bind(this, id) , '?view=rcwildfires&fId=' + id);
  });
  cleanupDrillDown();
  $(_viewer._timeline.container).css('visibility', 'hidden');
  _viewer.forceResize();
  rcwildfireListDataSource.show = true;
  utils.setUpResetView(_viewer);
  // This is a bit of hack because flyTo is not working from here
  $('#resetView').click();
}

function gotoFire(id) {
  window.spinner.spin($('#spinner')[0]);
  console.log('go to', id);
  savedState = {};
  $('.leaflet-popup-close-button').click();

  var f = rcwildfireListData.find(function(f) {
    return f.fireFileName === id;
  });

  data.getJSONData(config.dataPaths.rcwildfiresPath + id + '.json', function(data) {

    data.fireReports.features.sort((a, b) => new Date(a.properties.fireReportDate) - new Date(b.properties.fireReportDate));
    for (var i=0; i<data.fireReports.features.length - 1; i++) {
      data.fireReports.features[i].properties.endDate = data.fireReports.features[i+1].properties.fireReportDate;
      //console.log(data.fireReports.features[i].properties.endDate);
    }
    data.fireReports.features[data.fireReports.features.length - 1].properties.endDate = '2017-12-31T07:00:00.000Z';

    setUpClock(data.fireReports.features[0].properties.fireReportDate, data.fireReports.features[data.fireReports.features.length - 1].properties.fireReportDate);

    var displayPlaybackControl = false;
    if (data.fireReports.features.length > 1) {
      displayPlaybackControl = true;
      $(_viewer._timeline.container).css('visibility', 'visible');
      _viewer.forceResize();
    }

    $('#infoPanel').html(rcwildfireInfoPanel({
      displayPlaybackControl: displayPlaybackControl,
      fireName: f.fireName,
      startDate: (new Date(data.fireReports.features[0].properties.fireReportDate)).toDateString(),
      endDate: (new Date(data.fireReports.features[data.fireReports.features.length - 1].properties.fireReportDate)).toDateString(),
      maxAcres: f.fireMaxAcres.toLocaleString()
    }));


    Cesium.GeoJsonDataSource.load(data.fireReports, {clampToGround: true, fill: (Cesium.Color.ORANGE).withAlpha(0.5)}).then(function(dataSource) {
      savedState.dataSource = dataSource;
      rcwildfireListDataSource.show = false;

      dataSource.entities.values.forEach(function(entity) {
        if (entity.properties.fireReportDate && entity.properties.endDate) {
          entity.properties.addProperty('doNotPick', true);
          addAvailability(entity, entity.properties.fireReportDate.getValue(), entity.properties.endDate.getValue());
        } else {
          entity.show = false;
          //console.log(entity);
        }
      });

      _viewer.dataSources.add(dataSource).then(function() {
        utils.setupPlaybackControlActions(animationViewModel, clockViewModel);
        //window.spinner.stop();
        _viewer.flyTo(dataSource).then(function() {
          window.spinner.stop();
        });
        utils.setUpResetView(_viewer, dataSource);
      });

    });
  });
}

function addAvailability(entity, startDate, endDate) {
  //console.log('Date range ' + startDate + ' ' + endDate);
  var timeInterval = new Cesium.TimeInterval({
    start: Cesium.JulianDate.fromIso8601(startDate),
    stop: Cesium.JulianDate.fromIso8601(endDate)
  });
  entity.availability = new Cesium.TimeIntervalCollection();
  entity.availability.addInterval(timeInterval);
}

function setUpClock(startDate, endDate) {
  _viewer.clock.startTime = Cesium.JulianDate.fromIso8601(startDate);
  var stopTime = Cesium.JulianDate.fromIso8601(endDate);
  Cesium.JulianDate.addDays(stopTime, 5, stopTime);

  _viewer.clock.stopTime = stopTime;
  _viewer.clock.currentTime = stopTime;
  _viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  _viewer.clock.multiplier = 262975 * Math.ceil((Cesium.JulianDate.daysDifference(stopTime, _viewer.clock.startTime))/30);
  _viewer.timeline.updateFromClock();
  _viewer.timeline.zoomTo(_viewer.clock.startTime, _viewer.clock.stopTime);
  _viewer.timeline.resize();
  console.log(_viewer.clock);
}

export function wipeoutView() {
  $('#resetView').off();
  $('#infoPanel').empty();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(rcwildfireListDataSource, true);
  cleanupDrillDown();
  rcwildfireListData = rcwildfireListDataSource = undefined;
}

function isValidId(id) {
  var fId = rcwildfireListData.find(function(f) {
    return f.fireFileName === id;
  });
  if (fId) {return true;}
}

function cleanupDrillDown() {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
  }
  _viewer.clock.shouldAnimate = false;
}

function setUpSummaryChart() {


}
