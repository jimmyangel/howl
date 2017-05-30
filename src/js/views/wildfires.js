/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from '../config.js';

import * as data from '../data.js';
import * as utils from '../utils.js';

import fireListInfoPanel from '../../templates/wildfires/fireListInfoPanel.hbs';
import fireInfoBox from '../../templates/wildfires/fireInfoBox.hbs';
import fireInfoPanel from '../../templates/wildfires/fireInfoPanel.hbs';
import wildfiresViewLabel from '../../templates/wildfires/wildfiresViewLabel.hbs';
import wildfiresHistoryChart from '../../templates/wildfires/wildfiresHistoryChart.hbs';

var fireListData;
var clockViewModel;
var animationViewModel;
var statsAll;
var _viewer;
var fireListDataSource;
var savedState;
var viewerCallbacks = [];

export function setupView (viewer) {
  $('#viewContainer').show();
  _viewer = viewer;
  //$('#infoPanel').html(fireListInfoPanel());
  $('#viewLabel').html(wildfiresViewLabel());
  $('#summaryChartContainer').html(wildfiresHistoryChart());

  clockViewModel = new Cesium.ClockViewModel(_viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);
  _viewer.timeline.makeLabel = function(date) {
    var gregorianDate = Cesium.JulianDate.toGregorianDate(date);
    return gregorianDate.year;
  };
  setupPlaybackControlActions();

  viewerCallbacks.push(_viewer.timeline.addEventListener('settime', function() {
    setPlaybackPauseMode();
  }, false));

  //_viewer.terrainProvider = new Cesium.CesiumTerrainProvider({url : 'https://assets.agi.com/stk-terrain/world'});
  //viewer.scene.globe.depthTestAgainstTerrain = true;

  _viewer.clock.shouldAnimate = false;

  _viewer.camera.flyTo(config.initialCameraView);

  viewerCallbacks.push(_viewer.scene.postRender.addEventListener(function()  {
    updateSpeedLabel(clockViewModel);
  }));

  //data.getJSONData('data/MTBS/MTBSCZML.json', function(data) {
  data.getJSONData('data/MTBS/MTBSOregonFiresGen20170330_FSampled.json', function(data) {
    fireListData = data;
    var statsAndCZML = utils.makeCZMLAndStatsForListOfFires(fireListData);
    statsAll = statsAndCZML.statsAll;
    setUpSummaryChart(statsAndCZML.stats, statsAll);
    Cesium.CzmlDataSource.load(statsAndCZML.czml).then(function(dataSource) {
      $('#loadingIndicator').hide();
      fireListDataSource = dataSource;
      var fireItems = getFireItems(utils.getUrlVars().fireId);
      if (fireItems) {
        fireListDataSource.show = false;
      }
      _viewer.dataSources.add(fireListDataSource).then(function() {
        $('#resetView').click(function() {
          _viewer.camera.flyTo(config.initialCameraView);
          return false;
        });
        /*setUpNonForestOption();
        setUpCumulativeOption();
        setUpInfoBox(); */
        var year = '';
        viewerCallbacks.push(_viewer.clock.onTick.addEventListener(function(event) {
          var clockYear = Cesium.JulianDate.toIso8601(event.currentTime).substr(0, 4);
          if (year !== clockYear) {
            year = clockYear;
            $('#viewLabel').show();
            $('#showingYear').text(year);
            updateNumberOfFiresLabel(firesShownCount(event.currentTime));
            updateTimePeriodLabel(year);
          }
        }));
        if (fireItems) {
          // history.pushState('', '', '?view=wildfires&fireId=' + fireItems.fireId);
          gotoFire(fireItems);
        } else {
          history.replaceState('', '', '?view=wildfires');
          gotoAll();
        }
      });
    });

  }, function (error) {
    console.log(error);
    throw error;
  });
}

export function restoreView() {
  var fireId = utils.getUrlVars().fireId;
  var fireItems = getFireItems(fireId);
  if (fireItems) {
    gotoFire(getFireItems(fireId));
  } else {
    if (fireId) {
      // This means invalid fireId and back button, so get rid of it
      history.replaceState('', '', '?view=wildfires');
    }
    gotoAll();
  }
}

export function wipeoutView() {
  console.log('wipeout wildfires');
  $('#viewLabel').empty();
  $('#viewLabel').hide();
  $('#infoPanel').empty();
  $('#summaryChartContainer').empty();
  _viewer.dataSources.remove(fireListDataSource, true);
  viewerCallbacks.forEach(function(removeCallback) {
    if (removeCallback) {
       removeCallback();
    }
  });
  cleanupDrillDown();

  fireListData = clockViewModel = animationViewModel = statsAll = fireListDataSource = savedState = undefined;
}

function updateTimePeriodLabel(y) {
  $('#cumulativeFromYear').text('');
  if ((y != statsAll.fromYear) && ($('#cumulative-option').is(":checked"))) {
    $('#cumulativeFromYear').text(statsAll.fromYear + '-');
  }
}

function updateNumberOfFiresLabel(n) {
  var nLabel =
    ('('+ n) +
    ($('#non-forest-option').is(":checked") ? '' : ' forest')  +
    (n === 1 ? ' fire)' : ' fires)');
  $('#numberOfFires').text(nLabel);
}

function setupPlaybackControlActions() {
  $('#pb-play').click(function() {
    if ($('#pb-play span').hasClass('glyphicon-play')) {
      animationViewModel.playForwardViewModel.command();
    } else {
      animationViewModel.pauseViewModel.command();
    }
    $('#pb-play span').toggleClass('glyphicon-pause glyphicon-play');
    $('#pb-play span').toggleClass('blink');
    // animationViewModel.playForwardViewModel.command();
    return false;
  });

  $('#pb-faster').click(function() {
    clockViewModel.multiplier = 2 * clockViewModel.multiplier;
    return false;
  });

  $('#pb-slower').click(function() {
    clockViewModel.multiplier = clockViewModel.multiplier / 2;
    return false;
  });

  $('#pb-start').click(function() {
    clockViewModel.currentTime = clockViewModel.startTime;
    setPlaybackPauseMode();
    updateTimePeriodLabel(statsAll.fromYear);
    return false;
  });

  $('#pb-end').click(function() {
    clockViewModel.currentTime = clockViewModel.stopTime;
    setPlaybackPauseMode();
    return false;
  });

}

function setPlaybackPauseMode() {
  if ($('#pb-play span').hasClass('glyphicon-pause')) {
    $('#pb-play').click();
  }
}

function updateSpeedLabel(clockViewModel) {
  $('#secsperyear').text((31556926/clockViewModel.multiplier).toFixed(2));
}

function setUpNonForestOption() {
  $('#non-forest-option').change(function() {
    var isNonForest = $(this).is(":checked");
    var fireExclusionList = utils.getFireExclusionList(fireListData, isNonForest ? 0 : 5);
    fireListDataSource.entities.values.forEach(function (entity) {
      entity.show = !fireExclusionList.includes(entity.id);
    });
    updateNumberOfFiresLabel(firesShownCount(_viewer.clock.currentTime));
  });
  $('#non-forest-option').change(); // To make sure the default kicks in
}

function setUpCumulativeOption () {
  $('#cumulative-option').change(function() {
    var isCumulative = $(this).is(":checked");
    fireListData.features.forEach(function(f) {
      var entity = fireListDataSource.entities.getById(f.properties.id);
      var timeInterval = entity.availability.get(0);
      if (isCumulative) {
        entity.availability.addInterval(new Cesium.TimeInterval({
          start: timeInterval.start,
          stop: Cesium.JulianDate.fromIso8601('2014-12-31T23:59:59.999Z')
        }));
      } else {
        entity.availability.removeInterval(timeInterval);
        entity.availability.addInterval(new Cesium.TimeInterval({
          start: timeInterval.start,
          stop: Cesium.JulianDate.fromIso8601((new Date(f.properties.ignitionDate)).getUTCFullYear() + '-12-31T23:59:59.999Z')
        }));
      }
    });
    updateNumberOfFiresLabel(firesShownCount(_viewer.clock.currentTime));
    updateTimePeriodLabel($('#showingYear').text());
  });
  $('#cumulative-option').change();
}

function firesShownCount(time) {
  var count = 0;
  fireListDataSource.entities.values.forEach(function (entity) {
    if (entity.show && entity.isAvailable(time)) {
      count++
    }
  });
  return count;
}

function setUpInfoBox() {
  // Disable entity tracking on double click
  (new Cesium.ScreenSpaceEventHandler(_viewer.scene.canvas)).setInputAction(function() {
      _viewer.trackedEntity = undefined;
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  // Add selected entity listener to open/close info box
  viewerCallbacks.push(_viewer.selectedEntityChanged.addEventListener(function(e) {
    if (e) {
      var fireItems = getFireItems(e.id);
      if (fireItems) {
        $('#infoBox').html(fireInfoBox(fireItems));
        showInfoBox();
        $('#ib-gotofire').click(function() {
          history.pushState({view: 'wildfires', fireId: fireItems.fireId}, '', '?view=wildfires&fireId=' + fireItems.fireId);
          gotoFire(fireItems);
          return false;
        });
      } else {
        _viewer.selectedEntity = undefined;
      }
    } else {
      hideInfoBox();
    }
  }));
}

function getFireItems(fireId) {
  var l = window.navigator.language;
  var o = {maximumFractionDigits: 0};
  var p = {style: 'percent', maximumFractionDigits: 0};
  var fire = fireListData.features.find(function(f) {
    return f.properties.id === fireId;
  });
  if (fire) {
    return {
      fireName: fire.properties.name,
      fireId: fire.properties.id,
      pdfLink: fire.properties.pdfLink,
      kmzLink: fire.properties.kmzLink,
      ignitionDate: (new Date(fire.properties.ignitionDate)).toDateString(),
      acres: fire.properties.acres.toLocaleString(l, o),
      forestAcres: fire.properties.forestAcres.toLocaleString(l, o),
      severityHighAcres:fire.properties.severityHighAcres.toLocaleString(l, o),
      severityHighPercent: (fire.properties.severityHighAcres / fire.properties.acres).toLocaleString(l, p),
      severityModerateAcres: fire.properties.severityModerateAcres.toLocaleString(l, o),
      severityModeratePercent: (fire.properties.severityModerateAcres / fire.properties.acres).toLocaleString(l, p),
      severityLowAcres:fire.properties.severityLowAcres.toLocaleString(l, o),
      severityLowPercent: (fire.properties.severityLowAcres / fire.properties.acres).toLocaleString(l, p),
      severityUnburnedAcres: fire.properties.severityUnburnedAcres.toLocaleString(l, o),
      severityUnburnedPercent: (fire.properties.severityUnburnedAcres / fire.properties.acres).toLocaleString(l, p),
      severityIncreasedGreenesAcres: fire.properties.severityIncreasedGreenesAcres.toLocaleString(l, o),
      severityIncreasedGreenesPercent: (fire.properties.severityIncreasedGreenesAcres / fire.properties.acres).toLocaleString(l, p),
      nonProcessingMaskAcres: fire.properties.nonProcessingMaskAcres.toLocaleString(l, o),
      nonProcessingMaskPercent: (fire.properties.nonProcessingMaskAcres / fire.properties.acres).toLocaleString(l, p),
    };
  }
}

function showInfoBox() {
  $('#infoBox').animate({'margin-right': 0, opacity: 0.8}, 200);
}

function hideInfoBox() {
  $('#infoBox').animate({'margin-right': '-30%', opacity: 0}, 200);
}

function gotoFire(fireItems) {
  savedState = {};
  $('#viewLabel').hide();
  _viewer.selectedEntity = undefined;
  $(_viewer._timeline.container).css('visibility', 'hidden');
  _viewer.forceResize();
  //$('.cesium-viewer-bottom').css('bottom', '0');
  //$('.cesium-viewer-timelineContainer').css('z-index', '-1');
  savedState.savedTp = _viewer.terrainProvider;
  savedState.savedTime = _viewer.clock.currentTime;
  savedState.savedIsNonForest = $('#non-forest-option').is(":checked");
  savedState.savedIsCumulative = $('#cumulative-option').is(":checked");

  setPlaybackPauseMode();
  hideInfoBox();
  $('#infoPanel').html(fireInfoPanel(fireItems));
  $('#l-gotoall').click(function() {
    return false;
  });
  $('#loadingIndicator').show();
  Cesium.KmlDataSource.load('data/MTBS/kmz/' + fireItems.kmzLink.split('/').pop(), {clampToGround: true}).then(function(dataSource) {
    fireListDataSource.show = false;

    var idsToRemove = [];
    var severityLayer;
    dataSource.entities.values.forEach(function(value) {
      if ((value.name === 'Post-Fire Landsat Image') ||
          (value.name === 'Pre-Fire Landsat Image') ||
          (value.name === 'Legend and Logos')) {
        idsToRemove.push(value.id);
      }
      if (value.name === 'Fire Severity') {
        value.show = false;

        severityLayer = _viewer.imageryLayers.addImageryProvider(
          new Cesium.SingleTileImageryProvider({
          url: value.rectangle.material.image,
            rectangle: new Cesium.Rectangle(
              value.rectangle.coordinates.getValue().west,
              value.rectangle.coordinates.getValue().south,
              value.rectangle.coordinates.getValue().east,
              value.rectangle.coordinates.getValue().north
            )
          })
        );
        savedState.severityLayer = severityLayer;
        $('.hidden-legend-item').css('display', 'inline-block');
        $('#infoPanelTransparency').change(function() {
          var t=($(this).val())/100;
          severityLayer.alpha = t;
        });
        $('#infoPanelTransparency').change();
      }
      if (value.name === 'Fire Perimeter') {
        value.show = false;
        if (value.polygon) {
          value.polygon.fill = true;
        }
      }
    });

    idsToRemove.forEach(function(id) {
      dataSource.entities.removeById(id);
    });

    _viewer.dataSources.add(dataSource).then(function() {
      savedState.dataSource = dataSource;
      $('#loadingIndicator').hide();
      _viewer.flyTo(dataSource);
      $('#resetView').click(function() {
        _viewer.flyTo(dataSource);
        return false;
      });

      $('#l-gotoall').click(function() {
        //history.back();
        history.pushState({view: 'wildfires'}, '', '?view=wildfires');
        gotoAll();
        return false;
      });
    });

  });

}

function gotoAll() {
  cleanupDrillDown();
  $('#infoPanel').html(fireListInfoPanel());
  setUpNonForestOption();
  setUpCumulativeOption();
  setUpInfoBox();
  setupPlaybackControlActions();
  fireListDataSource.show = true;
  if ((savedState) && (savedState.savedIsNonForest)) {
    $('#non-forest-option').prop('checked', true);
    $('#non-forest-option').change();
  }
  if ((savedState) && (savedState.savedIsCumulative)) {
    $('#cumulative-option').prop('checked', true);
    $('#cumulative-option').change();
  }
  $('#resetView').click(function() {
    _viewer.flyTo(config.initialCameraView);
    return false;
  });

  // This is a bit of hack because flyTo is not working from here
  $('#resetView').click();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  //$('.cesium-viewer-bottom').css('bottom', '30px');
  //$('.cesium-viewer-timelineContainer').css('z-index', 'auto');
  _viewer.timeline.resize();
  $('#viewLabel').show();
}

function cleanupDrillDown() {
  if (savedState) {
    _viewer.dataSources.remove(savedState.dataSource, true);
    _viewer.imageryLayers.remove(savedState.severityLayer, true);
    _viewer.clock.currentTime = savedState.savedTime;
    _viewer.terrainProvider = savedState.savedTp;
  }
}

function setUpSummaryChart(stats, statsAll) {
  var metricNames = [
    'severityHighAcres',
    'severityModerateAcres',
    'severityLowAcres'
  ];
  var ctx = $('#summaryChart')[0];
  var datasets = [
    {
      type: 'line',
      label: 'High',
      data: [],
      backgroundColor: 'rgba(255, 0, 0, 0.8)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1,
      stack: 1
    },
    {
      type: 'line',
      label: 'Moderate',
      data: [],
      backgroundColor: 'rgba(255, 255, 0, 0.8)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1,
      stack: 1
    },
    {
      type: 'line',
      label: 'Low',
      data: [],
      backgroundColor: 'rgba(121, 255, 211, 0.8)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1,
      stack: 1
    }
  ]
  var labels = [];
  for (var year in stats) {
    labels.push(year);
  }
  labels.sort();
  labels.forEach(function(label) {
    datasets.forEach(function(dataset, i) {
      dataset.data.push(((stats[label][metricNames[i]])/1000).toFixed(2));
    });
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      scales: {
        yAxes:
        [
          {
            ticks: {beginAtZero:true},
            stacked: true,
            scaleLabel: {
              display: true,
              labelString: 'Area (in thousands of acres)'
            }
          }
        ]
      },
      title: {
        display: true,
        text: 'Oregon Recent History of Wildfire Severity (' + statsAll.fromYear + ' - ' + statsAll.toYear + ')',
        fontSize: 18
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
