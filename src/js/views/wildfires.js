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

var fireListData;
var clockViewModel;
var animationViewModel;
var statsAll;

export function setupView (viewer) {
  $('#infoPanel').html(fireListInfoPanel());
  $('#viewLabel').html(wildfiresViewLabel());

  clockViewModel = new Cesium.ClockViewModel(viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);
  viewer.timeline.makeLabel = function(date) {
    var gregorianDate = Cesium.JulianDate.toGregorianDate(date);
    return gregorianDate.year;
  };
  setupPlaybackControlActions();

  viewer.timeline.addEventListener('settime', function() {
    setPlaybackPauseMode();
  }, false);

  viewer.terrainProvider = new Cesium.CesiumTerrainProvider({url : 'https://assets.agi.com/stk-terrain/world'});
  //viewer.scene.globe.depthTestAgainstTerrain = true;

  viewer.clock.shouldAnimate = false;

  viewer.camera.flyTo(config.initialCameraView);

  //data.getJSONData('data/MTBS/MTBSCZML.json', function(data) {
  data.getJSONData('data/MTBS/MTBSOregonFiresGen20170330_FSampled.json', function(data) {
    fireListData = data;
    var statsAndCZML = utils.makeCZMLAndStatsForListOfFires(fireListData);
    statsAll = statsAndCZML.statsAll;
    setUpSummaryChart(statsAndCZML.stats, statsAll);
    Cesium.CzmlDataSource.load(statsAndCZML.czml).then(function(dataSource) {
      $('#loadingIndicator').hide();
      viewer.dataSources.add(dataSource).then(function() {
        viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function(commandInfo){
          viewer.camera.flyTo(config.initialCameraView);
          commandInfo.cancel = true;
        });
        setUpNonForestOption(dataSource, viewer);
        setUpCumulativeOption(dataSource, viewer);
        setUpInfoBox(dataSource, viewer);
        var year = '';
        viewer.clock.onTick.addEventListener(function(event) {
          var clockYear = Cesium.JulianDate.toIso8601(event.currentTime).substr(0, 4);
          if (year !== clockYear) {
            year = clockYear;
            $('#viewLabel').show();
            $('#showingYear').text(year);
            updateNumberOfFiresLabel(firesShownCount(dataSource, event.currentTime));
            updateTimePeriodLabel(year);
          }
        });
      });
    });

    viewer.scene.postRender.addEventListener(function()  {
      updateSpeedLabel(clockViewModel);
    });

  }, function (error) {
    console.log(error);
    throw error;
  });
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
    console.log('hey', statsAll.fromYear);
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

function setUpNonForestOption(dataSource, viewer) {
  $('#non-forest-option').change(function() {
    var isNonForest = $(this).is(":checked");
    var fireExclusionList = utils.getFireExclusionList(fireListData, isNonForest ? 0 : 5);
    dataSource.entities.values.forEach(function (entity) {
      entity.show = !fireExclusionList.includes(entity.id);
    });
    updateNumberOfFiresLabel(firesShownCount(dataSource, viewer.clock.currentTime));
  });
  $('#non-forest-option').change(); // To make sure the default kicks in
}

function setUpCumulativeOption (dataSource, viewer) {
  $('#cumulative-option').change(function() {
    var isCumulative = $(this).is(":checked");
    fireListData.features.forEach(function(f) {
      var entity = dataSource.entities.getById(f.properties.id);
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
    updateNumberOfFiresLabel(firesShownCount(dataSource, viewer.clock.currentTime));
    updateTimePeriodLabel($('#showingYear').text());
  });
  $('#cumulative-option').change();
}

function firesShownCount(dataSource, time) {
  var count = 0;
  dataSource.entities.values.forEach(function (entity) {
    if (entity.show && entity.isAvailable(time)) {
      count++
    }
  });
  return count;
}

function setUpInfoBox(dataSource, viewer) {
  // Disable entity tracking on double click
  (new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)).setInputAction(function() {
      viewer.trackedEntity = undefined;
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  // Add selected entity listener to open/close info box
  viewer.selectedEntityChanged.addEventListener(function(e) {
    if (e) {
      var fire = fireListData.features.find(function(f) {
        return f.properties.id === e.id;
      });
      if (fire) {
        var fireItems = {
          fireName: fire.properties.name,
          fireId: fire.properties.id,
          pdfLink: fire.properties.pdfLink,
          ignitionDate: (new Date(fire.properties.ignitionDate)).toDateString(),
          acres: fire.properties.acres.toFixed(),
          forestAcres: fire.properties.forestAcres.toFixed(),
          severityHighAcres:fire.properties.severityHighAcres.toFixed(),
          severityModerateAcres: fire.properties.severityModerateAcres.toFixed(),
          severityLowAcres:fire.properties.severityLowAcres.toFixed(),
          severityUnburnedAcres: fire.properties.severityUnburnedAcres.toFixed(),
          severityIncreasedGreenesAcres: fire.properties.severityIncreasedGreenesAcres.toFixed(),
          nonProcessingMaskAcres: fire.properties.nonProcessingMaskAcres.toFixed()
        };
        $('#infoBox').html(fireInfoBox(fireItems));
        showInfoBox();
        $('#ib-gotofire').click(function() {
          gotoFire(fire.properties.id, fire.properties.kmzLink.split('/').pop(), dataSource, viewer, e.cylinder.material, fireItems);
          return false;
        });
      } else {
        viewer.selectedEntity = undefined;
      }
    } else {
      hideInfoBox();
    }
  });
}

function showInfoBox() {
  $('#infoBox').animate({'margin-right': 0, opacity: 0.8}, 200);
}

function hideInfoBox() {
  $('#infoBox').animate({'margin-right': '-30%', opacity: 0}, 200);
}

function gotoFire(id, fileName, fireListDataSource, viewer, material, fireItems) {
  $('#viewLabel').hide();
  viewer.selectedEntity = undefined;
  $('.cesium-viewer-bottom').css('bottom', '0');
  $('.cesium-viewer-timelineContainer').css('z-index', '-1');
  var savedTp = viewer.terrainProvider;
  var savedTime = viewer.clock.currentTime;
  var savedIsNonForest = $('#non-forest-option').is(":checked");
  var savedIsCumulative = $('#cumulative-option').is(":checked");

  setPlaybackPauseMode();
  hideInfoBox();
  $('#infoPanel').html(fireInfoPanel(fireItems));
  $('#l-gotoall').click(function() {
    return false;
  });
  $('#loadingIndicator').show();
  Cesium.KmlDataSource.load('data/MTBS/kmz/' + fileName, {clampToGround: true}).then(function(dataSource) {
    //fireListDataSource.entities.getById(id).show = false;
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

        severityLayer = viewer.imageryLayers.addImageryProvider(
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
        $('.hidden-legend-item').css('display', 'inline-block');
        $('#infoPanelTransparency').change(function() {
          var t=($(this).val())/100;
          severityLayer.alpha = t;
        });
        $('#infoPanelTransparency').change();
        /*$('#assessmentOption').change(function() {
          var tp = new Cesium.EllipsoidTerrainProvider();
          value.show = $(this).is(":checked");
          // This is temporary until Cesium adds support for image clamping
          viewer.terrainProvider = value.show ? tp : savedTp;

          if (value.show) {
            $('#severityLegend, #transparencyLegend').hide();
            $('.hidden-legend-item').css('display', 'inline-block');
          } else {
            $('#severityLegend, #transparencyLegend').show();
            $('.hidden-legend-item').css('display', 'none');
          }
        }) */
      }
      if (value.name === 'Fire Perimeter') {
        value.show = false;
        if (value.polygon) {
          value.polygon.fill = true;
          //var t = ($('#infoPanelTransparency').val())/100;
          //value.polygon.material = material.color.getValue().withAlpha(t);
          /*$('#infoPanelTransparency').change(function() {
            var t=($(this).val())/100;
            value.polygon.material = material.color.getValue().withAlpha(t);
          });
          $('#infoPanelTransparency').change(); */
        }
      }
    });

    idsToRemove.forEach(function(id) {
      dataSource.entities.removeById(id);
    });

    viewer.dataSources.add(dataSource).then(function() {
      $('#loadingIndicator').hide();
      viewer.flyTo(dataSource);
      viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function(commandInfo){
        viewer.flyTo(dataSource);
        commandInfo.cancel = true;
      });

      $('#l-gotoall').click(function() {
        viewer.dataSources.remove(dataSource, true);
        viewer.imageryLayers.remove(severityLayer, true);
        viewer.clock.currentTime = savedTime;
        viewer.terrainProvider = savedTp;
        $('#infoPanel').html(fireListInfoPanel());
        setUpNonForestOption(fireListDataSource, viewer);
        setUpCumulativeOption(fireListDataSource, viewer);
        setUpInfoBox(fireListDataSource, viewer);
        setupPlaybackControlActions();
        fireListDataSource.show = true;
        if (savedIsNonForest) {
          $('#non-forest-option').prop('checked', true);
          $('#non-forest-option').change();
        }
        if (savedIsCumulative) {
          $('#cumulative-option').prop('checked', true);
          $('#cumulative-option').change();
        }
        viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function(commandInfo){
          viewer.flyTo(config.initialCameraView);
          commandInfo.cancel = true;
        });
        // This is a bit of hack because flyTo is not workimg from here
        $('.cesium-home-button').click();
        $('.cesium-viewer-bottom').css('bottom', '30px');
        $('.cesium-viewer-timelineContainer').css('z-index', 'auto');
        viewer.timeline.resize();
        $('#viewLabel').show();
        return false;
      });
    });

  });

}

function setUpSummaryChart(stats, statsAll) {
  var ctx = $('#summaryChart')[0];
  var data = [];
  var labels = [];
  console.log(stats);
  for (var year in stats) {
    console.log(stats[year]);
    labels.push(year);
  }
  labels.sort();
  labels.forEach(function(label) {
    data.push(stats[label].acres.toFixed());
  });
  console.log(labels);
  /*stats.forEach(function(stat) {
    console.log(stat);
  });*/

  var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'acres',
            data: data,
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255,99,132,1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero:true
                }
            }]
        }
    }
  });
  console.log(stats);
}
