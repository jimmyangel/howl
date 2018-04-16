/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './rcwildfiresConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';

import rcwildfiresListInfoPanel from '../templates/rcwildfiresListInfoPanel.hbs';
import rcwildfireInfoPanel from '../templates/rcwildfireInfoPanel.hbs';
import rcwildfireViewLabel from '../templates/rcwildfireViewLabel.hbs';
import rcwildfiresChart from '../templates/rcwildfiresChart.hbs';

import 'magnific-popup/dist/jquery.magnific-popup.min.js';
import 'magnific-popup/dist/magnific-popup.css';

var labelDateOptions = {year: 'numeric', month: 'short', day: 'numeric' };

var _viewer;
var statsAll;
var rcwildfireListData;
var fireYears;
var clockViewModel;
var animationViewModel;
var rcwildfireListDataSource;
var savedState;
var viewerCallbacks = [];
var thisYear;

export function setupView (viewer) {

  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;
  $('#summaryChartContainer').html(rcwildfiresChart());
  clockViewModel = new Cesium.ClockViewModel(_viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);

  _viewer.timeline.makeLabel = function(date) {
    var jDate = Cesium.JulianDate.toDate(date);
    return (jDate.getMonth()+1) + '/' + jDate.getDate() + '/' + jDate.getFullYear();
  };

  $(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  statsAll = {};

  getAllRcwildfiresList(function() {
    updateElevations(function() {
      Cesium.CzmlDataSource.load(makeCZMLAndStatsForListOfRcfires(rcwildfireListData)).then(function(dataSource) {
        rcwildfireListDataSource = dataSource;
        rcwildfireListDataSource.show = false;
        _viewer.dataSources.add(dataSource).then(function() {
          window.spinner.stop();
          viewdispatcher.popUpLinkClickHandler = function(id) {
            this.inViewDispatch(gotoFire.bind(this, id) , '?view=rcwildfires&fId=' + id);
          }
          var fId = utils.getUrlVars().fId;
          if (fId && findId(fId)) {
            gotoFire(fId);
          } else {
            viewdispatcher.cleanUrl();
            gotoAll();
          }
        });
      });
    });
  });
}

function updateElevations(callback) {
  var pos = [];
  rcwildfireListData.forEach(function(f) {
    pos.push(Cesium.Cartographic.fromDegrees(f.location[0], f.location[1]));
  });

  Cesium.sampleTerrainMostDetailed(_viewer.terrainProvider, pos).then(function(updPos) {
    updPos.forEach(function(p, i) {
      rcwildfireListData[i].location.push(p.height);
    });
    return callback();
  });
}

function getAllRcwildfiresList(callback) {
  rcwildfireListData = [];
  fireYears = [];
  var today = new Date();
  thisYear = today.getFullYear();
  initStats(thisYear, today.getMonth());

  getWildfiresListforYear(config.dataPaths.rcwildfiresCurrentDataPath, 'current_year', function() {
    getWildfiresListforYear(config.dataPaths.rcwildfiresDataPath, thisYear - 1, function() {
      getWildfiresListforYear(config.dataPaths.rcwildfiresDataPath, thisYear - 2, function() {
        return callback();
      });
    });
  });
}

function getWildfiresListforYear(dataPath, year, callback) {
  data.getJSONData(dataPath + year + config.dataPaths.rcwildfireRecordSuffix, function(data) {
    rcwildfireListData = rcwildfireListData.concat(data);
    fireYears.push({year: year, selected: false, label: (year === 'current_year') ? 'Current' : year});
    return callback();
  }, function(err) {
    if (err.status === 404) return callback();
    throw(err);
  });
}

function initStats(y, m) {
  var mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var aSize = 24 + m + 1;
  statsAll.acreageData = new Array(aSize);
  statsAll.cumAcresData = new Array(aSize);
  statsAll.labels = [];
  statsAll.acreageData.fill(0);
  statsAll.cumAcresData.fill(0);
  for (var i=0; i<aSize; i++) {
    statsAll.labels.push(mNames[i % 12] + ' ' + (y - (2 - Math.floor(i/12))));
  }
}

function makeCZMLAndStatsForListOfRcfires (rcwildfireListData) {
  var rcwildfiresCZML = [
    {
      id: 'document',
      name: 'rcwildfires',
      version: "1.0",
    }
  ];
  var pathToFlameIcon = require('../../../images/flame.png');
  rcwildfireListData.forEach(function (f) {
    var czmlItem = {
      id: f.fireYear + '-' + f.fireFileName,
      name: f.fireName,
      billboard: {
        image : pathToFlameIcon,
        verticalOrigin: 'BOTTOM',
        //heightReference: 'CLAMP_TO_GROUND',
        //scale: 0.05,
        scaleByDistance: {
          nearFarScalar: [2e4, 0.1, 1.8e6, 0.005]
        }
      },
      position: {
        cartographicDegrees: [f.location[0], f.location[1], f.location[2]]
      },
      properties: {
        howlHasFeaturePopUp: true,
        fireYear: f.fireYear
      }
    };
    rcwildfiresCZML.push(czmlItem);

    // Record max acres for each month reported
    var fireMonthlyAcres = {};
    f.fireReports.forEach(function(fr, i) {
      var incAcres = 0;
      if (i>0) {
        incAcres = parseInt(fr.fireReportAcres) - parseInt(f.fireReports[i-1].fireReportAcres);
      } else {
        incAcres = parseInt(fr.fireReportAcres);
      }
      var fmaKey = fr.fireReportDate.substring(0, 7);
      if (fireMonthlyAcres[fmaKey]) {
        fireMonthlyAcres[fmaKey] += incAcres;
      } else {
        fireMonthlyAcres[fmaKey] = incAcres;
      }
    });
    // Accumulate acres at the right month slot
    var fireMonthlyAcresKeys = Object.keys(fireMonthlyAcres);
    fireMonthlyAcresKeys.forEach(function(key) {
      var mIdx = (parseInt(key.substring(5,7)) - 1) + 12*(parseInt(key.substring(0,5))- thisYear + 2);
      statsAll.acreageData[mIdx] += fireMonthlyAcres[key];
    });
  });

  // Scale down 1000 and calculate cumulative
  statsAll.cumAcresData.forEach(function (cad, i) {
    statsAll.acreageData[i] = parseInt((statsAll.acreageData[i] / 1000).toFixed(0));
    if (i % 12) {
      statsAll.cumAcresData[i] = statsAll.cumAcresData[i-1] + statsAll.acreageData[i];
    }
  });
  setUpSummaryChart();
  return rcwildfiresCZML;
}

export function restoreView() {
  var fId = utils.getUrlVars().fId;
  if (fId && findId(fId)) {
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
  $('#infoPanel').html(rcwildfiresListInfoPanel({
    fireYears : fireYears,
    listOfFires: rcwildfireListData
  }));
  $('.rcwildfires-list-item').click(function() {
    var id = $(this).attr('data-fireId');
    viewdispatcher.inViewDispatch(gotoFire.bind(this, id) , '?view=rcwildfires&fId=' + id);
  });
  cleanupDrillDown();
  $(_viewer._timeline.container).css('visibility', 'hidden');
  _viewer.forceResize();

  $('.fire-year').change(function() {
    var y = $(this).val();
    showFiresForYear(y);
    fireYears.forEach(function(el, i) {fireYears[i].selected = (el.year == y)});
  });
  showFiresForYear($('.fire-year:checked').val());

  rcwildfireListDataSource.show = true;
  utils.setUpResetView(_viewer);
  // This is a bit of hack because flyTo is not working from here
  $('#resetView').click();
}

function showFiresForYear(year) {
  var n = 0;
  $('.rcwildfires-list-item').each(function() {
    if ($(this).attr('data-fireYear') === year) {
      $(this).show();
      n++;
    } else {
      $(this).hide();
    }
  });
  $('#firesListed').text(n);
  rcwildfireListDataSource.entities.values.forEach(function(entity) {
    if (entity.properties.fireYear && (entity.properties.fireYear.getValue() == year)) {
      entity.show = true;
    } else {
      entity.show = false;
    }
  });
}

function gotoFire(id) {
  var fireFileName = id.substring(5);
  window.spinner.spin($('#spinner')[0]);
  savedState = {};
  $('.leaflet-popup-close-button').click();

  var f = findId(id);

  $('#viewLabel').html(rcwildfireViewLabel(f));
  $('#viewLabel').show();

  data.getJSONData(config.dataPaths.rcwildfiresDataPath + f.fireYear + '/' + fireFileName + '.json', function(data) {

    data.objects.collection.geometries.sort((a, b) => new Date(a.properties.fireReportDate) - new Date(b.properties.fireReportDate));
    for (var i=0; i<data.objects.collection.geometries.length - 1; i++) {
      data.objects.collection.geometries[i].properties.endDate = data.objects.collection.geometries[i+1].properties.fireReportDate;
    }
    data.objects.collection.geometries[data.objects.collection.geometries.length - 1].properties.endDate =
      data.objects.collection.geometries[data.objects.collection.geometries.length - 1].properties.fireReportDate.substr(0, 4) + '-12-31T07:00:00.000Z';

    setUpClock(data.objects.collection.geometries[0].properties.fireReportDate, data.objects.collection.geometries[data.objects.collection.geometries.length - 1].properties.fireReportDate);

    var displayPlaybackControl = false;
    if (data.objects.collection.geometries.length > 1) {
      displayPlaybackControl = true;
      $(_viewer._timeline.container).css('visibility', 'visible');
      _viewer.forceResize();
    }

    $('#infoPanel').html(rcwildfireInfoPanel({
      displayPlaybackControl: displayPlaybackControl,
      fireName: f.fireName,
      startDate: (new Date(data.objects.collection.geometries[0].properties.fireReportDate)).toLocaleDateString('en-US', labelDateOptions),
      endDate: (new Date(data.objects.collection.geometries[data.objects.collection.geometries.length - 1].properties.fireReportDate)).toLocaleDateString('en-US', labelDateOptions),
      maxAcres: f.fireMaxAcres.toLocaleString(),
      inciwebId: f.inciwebId
    }));

    Cesium.GeoJsonDataSource.load(data, {clampToGround: true, fill: (Cesium.Color.ORANGE).withAlpha(0.5)}).then(function(dataSource) {
      savedState.dataSource = dataSource;
      rcwildfireListDataSource.show = false;

      dataSource.entities.values.forEach(function(entity) {
        if (entity.properties.fireReportDate && entity.properties.endDate) {
          entity.properties.addProperty('doNotPick', true);
          addAvailability(entity, entity.properties.fireReportDate.getValue(), entity.properties.endDate.getValue());
        } else {
          entity.show = false;
        }
      });

      $('#shapeTransparency').change(function() {
        var t=($(this).val())/100;
        dataSource.entities.values.forEach(function(entity) {
          if (entity.polygon) {
            entity.polygon.material = entity.polygon.material.color.getValue().withAlpha(t);
          }
        });
        //$('#shapeTransparency').change(); // Check this?
      });

      _viewer.dataSources.add(dataSource).then(function() {
        utils.setupPlaybackControlActions(animationViewModel, clockViewModel);
        viewerCallbacks.push(_viewer.timeline.addEventListener('settime', function() {
          utils.setPlaybackPauseMode();
        }, false));

        var lastDayNumber;
        viewerCallbacks.push(_viewer.clock.onTick.addEventListener(function(event) {
          if (lastDayNumber !== event.currentTime.dayNumber) { // Changed day? update label
            lastDayNumber = event.currentTime.dayNumber;
            var e;
            dataSource.entities.values.forEach(function(entity) {
              if (entity.isAvailable(_viewer.clock.currentTime)) {e = entity; return }
            });
            if (e) {
              $('#rcwildfireReportDate').text(new Date(e.properties.fireReportDate.getValue()).toLocaleDateString('en-US', labelDateOptions));
              if (e.properties.GISACRES) {
                 $('#rcwildfireReportAcres').text(Number((e.properties.GISACRES.getValue()).toFixed(0)).toLocaleString());
              } else {
                $('#rcwildfireReportAcres').text('N/A');
              }
            }
          }
        }));

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

  // Extend the stop time by 20% to allow viewing of the last report
  Cesium.JulianDate.addDays(stopTime, Math.ceil(Cesium.JulianDate.daysDifference(stopTime, _viewer.clock.startTime)/5), stopTime);

  _viewer.clock.stopTime = stopTime;
  _viewer.clock.currentTime = stopTime;
  _viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;

  // Adjust multiplier to make animation last defaultAnimationTime
  _viewer.clock.multiplier = Cesium.JulianDate.secondsDifference(stopTime, _viewer.clock.startTime)/config.defaultAnimationTime;

  _viewer.timeline.updateFromClock();
  _viewer.timeline.zoomTo(_viewer.clock.startTime, _viewer.clock.stopTime);
  _viewer.timeline.resize();
}

export function wipeoutView() {
  $('#resetView').off();
  $('#infoPanel').empty();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(rcwildfireListDataSource, true);
  cleanupDrillDown();
  rcwildfireListData = rcwildfireListDataSource = fireYears = undefined;
}

function findId(id) {
  var fireFileName = id.substring(5);
  var fireYear = parseInt(id.substring(0, 4));
  var fId = rcwildfireListData.find(function(f) {
    return ((f.fireYear === fireYear) && (f.fireFileName === fireFileName));
  });
  return fId;
}

function cleanupDrillDown() {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
  }
  _viewer.clock.shouldAnimate = false;
  viewerCallbacks.forEach(function(removeCallback) {
    if (removeCallback) {
       removeCallback();
    }
  });
  $('#viewLabel').hide();
}

function setUpSummaryChart() {

  var ctx = $('#summaryChart')[0];

  var datasets = [
    {
      type: 'line',
      label: 'Monthly',
      yAxisID: 'Acres',
      data: statsAll.acreageData,
      backgroundColor: 'rgba(255,255,0, 0.3)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1
    },
    {
      type: 'bar',
      label: 'Cumulative',
      yAxisID: 'Acres',
      data: statsAll.cumAcresData,
      backgroundColor: 'rgba(255,127,80, 0.3)',
      borderColor: 'rgba(255,127,80, 1)',
      borderWidth: 1
    }
  ]

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: statsAll.labels,
      datasets: datasets
    },
    options: {
      scales: {
        yAxes: [{
          position: 'left',
          id: 'Acres',
          ticks: {beginAtZero:true},
          scaleLabel: {
            display: true,
            labelString: 'Area (in thousands of acres)'
          }
        }],
        xAxes: [{
          ticks: {
              autoSkip: false
          }
        }]
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 18
        }
      }
    }
  });
}
