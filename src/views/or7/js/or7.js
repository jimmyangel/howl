/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './or7Config.js';
import {defaultDataPathBaseUrl} from '../../../js/config.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';

import or7InfoPanel from '../templates/or7InfoPanel.hbs';
import or7LogEntries from '../templates/or7LogEntries.hbs';
import or7ViewLabel from '../templates/or7ViewLabel.hbs';
import or7Chart from '../templates/or7Chart.hbs';
import or7Photos from '../templates/or7Photos.hbs';

import 'magnific-popup/dist/jquery.magnific-popup.min.js';
import 'magnific-popup/dist/magnific-popup.css';
//$('#whatever').magnificPopup({type:'image'}); --> example init


var labelDateOptions = {year: 'numeric', month: 'short', day: 'numeric' };

var _viewer;
var or7dataSource;
var or7kmlDataSource;
var or7plDataSource;
var or7wDataSource;
var or7StoryMapLayer;
var or7data;
var clockViewModel;
var animationViewModel;
var statsAll;
var viewerCallbacks = [];

export function setupView (viewer) {
  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  //$(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  clockViewModel = new Cesium.ClockViewModel(_viewer.clock);
  animationViewModel = new Cesium.AnimationViewModel(clockViewModel);

  _viewer.timeline.makeLabel = function(date) {
    var gregorianDate = Cesium.JulianDate.toGregorianDate(date);
    return gregorianDate.month + '/' + gregorianDate.year;
  };

  _viewer.clock.shouldAnimate = false;

  //_viewer.scene.globe.depthTestAgainstTerrain = true;
  $('#infoPanel').html(or7InfoPanel());

  // Show timeline
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  _viewer.timeline.resize();

  data.getJSONData(config.dataPaths.or7, function(or7Data) {
    or7data = or7Data;

    wplCrossings(function() {
      makeCZMLforOR7(function(or7CZML) {

        Cesium.CzmlDataSource.load(or7CZML).then(function(dataSource) {
          or7dataSource = dataSource;
          var or7JourneyEntity = or7dataSource.entities.getById('or7journey');
          or7JourneyEntity.orientation = new Cesium.VelocityOrientationProperty(or7JourneyEntity.position);

          _viewer.dataSources.add(or7dataSource).then(function() {

            utils.setupPlaybackControlActions(animationViewModel, clockViewModel);

            viewerCallbacks.push(_viewer.timeline.addEventListener('settime', function() {
              utils.setPlaybackPauseMode();
            }, false));

            viewerCallbacks.push(_viewer.selectedEntityChanged.addEventListener(function(e) {
              if (e && e.id.startsWith('or7journey-l')) {
                _viewer.selectedEntity = undefined;
                $('#or7FirstPhotoForId' + e.properties.Id.getValue()).click();
              }
            }));

            var isConstantSpeedOption = false;
            var isAccelerated = false;
            var lastDayNumber;
            viewerCallbacks.push(_viewer.clock.onTick.addEventListener(function(event) {
              if (lastDayNumber !== event.currentTime.dayNumber) { // Changed day? update label
                lastDayNumber = event.currentTime.dayNumber;
                var currDate = Cesium.JulianDate.toDate(event.currentTime).toLocaleDateString('en-US', labelDateOptions);
                $('#or7PosDate').text(currDate);
                var propertyValues = or7dataSource.entities.getById('or7entries').properties.getValue(_viewer.clock.currentTime);
                $('#or7LastEvent').text(propertyValues.entries);
                if (!isConstantSpeedOption) {
                  if (propertyValues.speedUp && !isAccelerated) {
                    utils.speedUpAnimation(clockViewModel, 4);
                    isAccelerated = true;
                  }
                  if (isAccelerated && !propertyValues.speedUp) {
                    utils.slowDownAnimation(clockViewModel, 4);
                    isAccelerated = false;
                  }
                }
              }

              // At the end of the journey, reset play button
              if (event.currentTime.equals(_viewer.clock.stopTime)) {
                utils.setPlaybackPauseMode()
              }
            }));

            _viewer.flyTo(or7dataSource).then(function() {
              window.spinner.stop();
              $('#hide-labels-option').change(); // Let the default kick

              // This is to prevent billboard from bouncing around
              or7JourneyEntity.model.show = true;
              _viewer.camera.percentageChanged = 0.1;

              // AAdjust width of corridors depending on camera height
              viewerCallbacks.push(_viewer.camera.changed.addEventListener(function() {
                if (or7dataSource) {  // This listener may still be active, so prevent crap out
                  adjustCorridorWidth(or7CZML);
                }
              }));
            });

            utils.setUpResetView(_viewer, or7dataSource);

            $('#hangoutTransparency').change(function() {
              var t=($(this).val())/100;
              or7dataSource.entities.values.forEach(function(entity) {
                if (entity.corridor && entity.properties.getValue().areaType === 'hangout') {
                  entity.corridor.material = entity.corridor.material.color.getValue().withAlpha(t);
                }
              });
            });
            $('#hangoutTransparency').change();

            $('#hide-labels-option').change(function() {
              var hideLabels = $(this).is(":checked");
              or7dataSource.entities.values.forEach(function(entity) {
                if (entity.label && entity.properties.getValue().areaType === 'hangout') {
                  entity.label.show = !hideLabels;
                }
              });
            });

            $('#constant-speed-option').change(function() {
              isConstantSpeedOption = $(this).is(":checked");
            });

            $('#track-entity-option').change(function() {
              if ($(this).is(':checked')) {
                viewer.trackedEntity = or7JourneyEntity;
              } else {
                viewer.trackedEntity = undefined;
              }
            });

            setUpViewPhotos();

            $('#viewLabel').html(or7ViewLabel());
            $('#viewLabel').show();

            $('#summaryChartContainer').html(or7Chart({miles: Number(statsAll.distanceData[statsAll.distanceData.length-1]).toLocaleString()}));
            setUpSummaryChart();

            viewdispatcher.cleanUrl();

          });
        });

        Cesium.KmlDataSource.load(config.dataPaths.or7StoryMapKmz).then(function(dataSource) {
          or7kmlDataSource = dataSource;
          dataSource.show = false;

          dataSource.entities.values.forEach(function(value) {
            if (value.name === 'OR7v2') {
              or7StoryMapLayer = _viewer.imageryLayers.addImageryProvider(
                new Cesium.SingleTileImageryProvider({
                  url: value.rectangle.material.image.getValue().url,
                  rectangle: new Cesium.Rectangle(
                    value.rectangle.coordinates.getValue().west,
                    value.rectangle.coordinates.getValue().south,
                    value.rectangle.coordinates.getValue().east,
                    value.rectangle.coordinates.getValue().north
                  ),
                  credit: 'Wolf OR-7 Expedition'
                })
              );
              or7StoryMapLayer.show = false;
              $('#story-map-overlay').change(function() {
                if ($(this).is(":checked")) {
                  or7StoryMapLayer.show = true;
                } else {
                  or7StoryMapLayer.show = false;
                }
              });
              $('#storymapTransparency').change(function() {
                var t=($(this).val())/100;
                or7StoryMapLayer.alpha = t;
              });
              $('#storymapTransparency').change();
            }
          });
        });

        data.getJSONData(config.dataPaths.or7Labels, function(or7LabelsData) {

          or7LabelsData.features.forEach(function(feature) {

            var tic = new Cesium.TimeIntervalCollection();
            tic.addInterval(Cesium.TimeInterval.fromIso8601({
              iso8601: (new Date(feature.properties.entryDate)).toISOString() + '/' + (new Date()).toISOString()
            }));

            _viewer.entities.add(new Cesium.Entity({
              availability: tic,
              label: new Cesium.LabelGraphics(
                {
                  text: feature.properties.labelText,
                  font: new Cesium.ConstantProperty('14px sans-serif'),
                  fillColor: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.BLACK,
                  outlineWidth: 3,
                  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                  scaleByDistance: new Cesium.ConstantProperty(new Cesium.NearFarScalar(2e5, 2, 1.8e6, 0.3))
                }),
                position: new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(
                  feature.geometry.coordinates[0], feature.geometry.coordinates[1]
                )),
                properties: {doNotPick: true}

            }));

          });

        });
      });
    });
  });

}

function adjustCorridorWidth(or7CZML) {
  or7CZML.forEach(function(item) {
    if (item.corridor) {
      var w = corridorWidth(_viewer.camera.positionCartographic.height);
      w = item.properties.isBorder ? w*2 : w;
      if (w != or7dataSource.entities.getById(item.id).corridor.width) {
        or7dataSource.entities.getById(item.id).corridor.width = w;
      }
    }
  });
}

function wplCrossings(callback) {

  // Add wilderness and public land crossings data sources in order to ensure zindex
  data.getJSONData(config.dataPaths.or7PublicLandsCrossingsLog, function(plx) {
    Cesium.GeoJsonDataSource.load(config.dataPaths.or7PublicLandsCrossed, {clampToGround: true}).then(function (ds) {
      or7plDataSource = ds;
      or7plDataSource.entities.values.forEach(function(entity) {
        if (!entity.position && entity.polygon) {
          addPolygonPosition(entity);
          addAvailability(entity, plx[entity.properties.id.getValue()]);
          entity.polygon.show = false;
        }
      });

      $('#hide-public-option').change(function() {
        var hidePublic = $(this).is(":checked");
        or7plDataSource.entities.values.forEach(function(entity) {
          if (entity.polygon) {
            entity.polygon.show = !hidePublic;
          }
        });
        recolorPath();
      });

      $('#plTransparency').change(function() {
        var t=($(this).val())/100;
        or7plDataSource.entities.values.forEach(function(entity) {
          if (entity.polygon) {
            entity.polygon.material = entity.polygon.material.color.getValue().withAlpha(t);
          }
        });
        $('#wildernessTransparency').change(); // I have to do this to keep pl layer in the back
        recolorPath(); // And this brings back the path to the front
      });

      _viewer.dataSources.add(or7plDataSource);

      Cesium.GeoJsonDataSource.load(config.dataPaths.or7AreasCrossed, {clampToGround: true}).then(function (ds) {
        or7wDataSource = ds;
        or7wDataSource.entities.values.forEach(function(entity) {
          addPolygonPosition(entity);
          addAvailability(entity, entity.properties.entryDate.getValue());
        });
        $('#wildernessTransparency').change(function() {
          var t=($(this).val())/100;
          or7wDataSource.entities.values.forEach(function(entity) {
            if (entity.polygon) {
              entity.polygon.material = entity.polygon.material.color.getValue().withAlpha(t);
            }
          });
          recolorPath(); // And this brings back the path to the front
        });

        _viewer.dataSources.add(or7wDataSource);
        callback();
      });

    });
  });
}

function recolorPath() {
  or7wDataSource.entities.values.forEach(function(entity) {
    if (entity.polygon) {
      entity.polygon.material = entity.polygon.material.color.getValue();
    }
  });
  or7dataSource.entities.values.forEach(function(entity) {
    if (entity.corridor) {
      entity.corridor.material = entity.corridor.material.color.getValue();
    }
  });
}

function addAvailability(entity, startDate) {
  var timeInterval = new Cesium.TimeInterval({
    start: Cesium.JulianDate.fromIso8601(((new Date(startDate)).toISOString())),
    stop: Cesium.JulianDate.fromIso8601((new Date()).toISOString())
  });
  entity.availability = new Cesium.TimeIntervalCollection();
  entity.availability.addInterval(timeInterval);
}

function addPolygonPosition(entity) {
  var pos = entity.polygon.hierarchy.getValue().positions;
  var center = Cesium.BoundingSphere.fromPoints(pos).center;
  entity.position = new Cesium.ConstantPositionProperty(center);
}

function setUpViewPhotos() {
  data.getJSONData(config.dataPaths.or7Photos, function(data) {
    data.baseUrl = defaultDataPathBaseUrl;
    $('#viewPhotosContainer').html(or7Photos(data));

    $('.or7-photos-gallery').each(function() {
      setUpMagnificForGallery(this)
    });

    $('#viewPhotosControl').click(function() {
      $(this).blur();
      $('#or7FirstPhotoForIdAll').click();
      return false;
    });

    $('#viewPhotosControl').show();
  });

  function setUpMagnificForGallery(element) {
    $(element).magnificPopup({
      delegate: 'a',
      type: 'image',
      tLoading: 'Loading image #%curr%...',
      mainClass: 'mfp-img-mobile',
      gallery: {
        enabled: true,
        navigateByImgClick: true,
        preload: [0,1] // Will preload 0 - before current, and 1 after the current image
      },
      image: {
        tError: '<a href="%url%">The image #%curr%</a> could not be loaded.',
        titleSrc: function(item) {
          return item.el.attr('title') + '<small>' + item.el.attr('subtitle') + '<a class="home-button" href="' + item.el.attr('source') + '" target="_blank"> (image source)</a></small>';
        }
      }
    });
  }
}

function corridorWidth(h) {
  var w = h>500000 ? h/100: h/50;
  return Math.min(20*Math.round(w/20), 2000);
}

function makeCZMLforOR7(callback) {

  var durations = [0];
  var prevCoord;

  var or7CZML = [
    {
      id: 'document',
      name: 'OR7',
      version: "1.0",
      clock: {
        interval: '',
        currentTime: '',
        multiplier: 262975,
        range: 'CLAMPED',
        step: 'SYSTEM_CLOCK_MULTIPLIER'
      }
    },
    {
      id: 'or7entries',
      properties: {
        entries: [],
        speedUp: []
      }
    }
  ];

  var or7Journey = {
    id: 'or7journey',
    availability: '',
    model: {
      gltf: config.dataPaths.or7WolfModel,
      scale: 1.5,
      minimumPixelSize: 128,
      //runAnimations: false,
      //shadowMode: 'DISABLED',
      //incrementallyLoadTextures: false,
      heightReference: 'RELATIVE_TO_GROUND',
      silhouetteSize: 2.0,
      silhouetteColor: {
        rgba: [255, 255, 255, 255]
      },
      show: false
    },
    position: {
      cartographicDegrees: []
    },
    properties: {
      doNotPick: true,
    },
    viewFrom: {
      cartesian: [0, -250000, 150000]
    }
  }

  function CorridorItem(id, prop, colorOverrride) {

    this.id = 'or7journey-c-' + id,
    this.properties = {
      isBorder: colorOverrride ? true : false,
      doNotPick: true
    };
    this.position = {cartographicDegrees: []};
    this.corridor = {
      width: colorOverrride ? 2*corridorWidth(600000) : corridorWidth(600000),
      material: {
        solidColor: {
          color: {
            rgba: (colorOverrride) ? ((Cesium.Color.fromCssColorString(colorOverrride)).toBytes()) : (getColor(prop))
          }
        }
      },
      cornerType: 'MITERED',
      positions: {
        cartographicDegrees: []
      }
    }
  }

  function PolygonOutlineItem(id, prop) {

    this.id = 'or7journey-o-' + id;
    this.properties = prop;
    this.properties.doNotPick = true;
    this.position = {cartographicDegrees: []};
    if (prop.entryDate) {
      this.availability = (new Date(prop.entryDate)).toISOString() + '/';
      if (prop.exitDate) {
        this.availability += (new Date(prop.exitDate)).toISOString();
      } else {
        this.availability += (new Date()).toISOString();
      }
    }
    this.corridor = {
      width: 800,
      positions: {
        cartographicDegrees: []
      },
      material: {
        solidColor: {
          color: {
            rgba: getColor(prop)
          }
        }
      }
    }
  }

  function LabelItem(id, prop) {

    this.id = 'or7journey-l-' + id;
    this.properties = {Id: prop.Id, areaType: prop.areaType};
    //this.properties.doNotPick = false;
    this.position = {cartographicDegrees: []};
    if (prop.entryDate) {
      this.availability = (new Date(prop.entryDate)).toISOString() + '/';
      if (prop.exitDate) {
        this.availability += (new Date(prop.exitDate)).toISOString();
      } else {
        this.availability += (new Date()).toISOString();
      }
    }
    this.label = {
      show: false,
      text: prop.areaText ? prop.areaText : '',
      font: 'bold 28px sans-serif',
      fillColor: {
        rgba: (Cesium.Color.BLACK).withAlpha(0.75).toBytes()
      },
      scale: 0.5,
      showBackground: true,
      backgroundColor: {
        rgba: (Cesium.Color.fromCssColorString('#F0F0F0').withAlpha(0.8)).toBytes()
      },
      backgroundPadding: {
        cartesian2: [20, 20]
      },
      outlineColor: {
        rgba: (Cesium.Color.fromCssColorString('#F8F8F8').withAlpha(0.8)).toBytes()
      },
      heightReference: 'CLAMP_TO_GROUND',
      pixelOffset: {
        cartesian2: prop.pixelOffset ? prop.pixelOffset : [0, 0]
      }
    }
  }

  function getColor(properties) {
    var color = [255, 255, 255, 255];
    if (properties && properties.fill) {
      color = (Cesium.Color.fromCssColorString(properties.fill)).toBytes();
      color[3] = (properties['fill-opacity']) ? (255 * properties['fill-opacity']) : 255;
    }
    return color;
  }

  data.getJSONData(config.dataPaths.or7JourneyLog, function(entries) {

    // Assumption: first entry matches first coordinate and last entry matches last coordinate
    var fromDate = (new Date(entries.features[0].properties.entryDate)).toISOString();
    var toDate = (new Date(entries.features[entries.features.length-1].properties.entryDate)).toISOString();
    or7CZML[0].clock.interval = fromDate + '/' + toDate;
    or7Journey.availability = or7CZML[0].clock.interval;
    or7CZML[0].clock.currentTime = fromDate; // Initial clock time

    initStats(fromDate, toDate);

    var logEntries = [];
    for (var i=0; i<entries.features.length; i++) {
      if (i > 0) {
        // Compute segment durations
        durations.push(calcDuration(entries.features[i].properties.entryDate, entries.features[i-1].properties.entryDate));
      }
      // Update czml custom properties
      var d1 = (new Date(entries.features[i].properties.entryDate)).toISOString();
      var d2 = (i === entries.features.length-1) ? d1 : (new Date(entries.features[i+1].properties.entryDate)).toISOString();
      d2 = d2.substr(0, d2.lastIndexOf('T'));
      or7CZML[1].properties.entries.push(
        {
          interval: d1 + '/' + d2,
          string: entries.features[i].properties.entryInfo
        }
      );
      or7CZML[1].properties.speedUp.push(
        {
          interval: d1 + '/' + d2,
          boolean: entries.features[i].properties.speedUp ? true: false
        }
      );
      // Update entry log info for panel
      logEntries.push(
        {
          date: (new Date(entries.features[i].properties.entryDate)).toLocaleDateString('en-US', labelDateOptions),
          info: entries.features[i].properties.entryInfo
        }
      );
    }
    $('#logEntries').html(or7LogEntries({logEntries: logEntries}));

    // Calculate leg distances
    var distances = new Array(durations.length).fill(0);
    var entryIndex = 0;
    or7data.features.forEach(function(or7f) {
      if (or7f.geometry.type === 'LineString') {
        or7f.geometry.coordinates.forEach(function(or7Coord) {
          if (isSameCoordinates(or7Coord, entries.features[entryIndex].geometry.coordinates)) {
            entryIndex++;
          } else {
            distances[entryIndex] += calcDistance(prevCoord, or7Coord);
          }
          prevCoord = or7Coord;
        });
      }
    });

    // Interpolate time
    var sumD = 0;
    var cumD = 0;
    entryIndex = 0;
    var itemId = 0;

    or7data.features.forEach(function(or7f) {

      // Add journey entities
      if (or7f.geometry.type === 'LineString') {
        var corridorItem = new CorridorItem(itemId++, or7f.properties);
        var corridorOutlineItem = new CorridorItem(itemId++, or7f.properties, '#8D6E27');
        corridorItem.position.cartographicDegrees.push(or7f.geometry.coordinates[0][0], or7f.geometry.coordinates[0][1], or7f.geometry.coordinates[0][2]);
        or7f.geometry.coordinates.forEach(function(or7Coord) {
          var iDate;
          if (isSameCoordinates(or7Coord, entries.features[entryIndex].geometry.coordinates)) {
            iDate = (new Date(entries.features[entryIndex].properties.entryDate)).toISOString();
            or7Journey.position.cartographicDegrees.push(iDate);
            sumD = 0;
            //prevCoord = or7Coord;
            entryIndex++;
          } else {
            //var distance = calcDistance(prevCoord, or7Coord);
            sumD += calcDistance(prevCoord, or7Coord);
            //cumD += distance;
            var ratio = sumD/distances[entryIndex];
            iDate = (new Date(Date.parse(entries.features[entryIndex-1].properties.entryDate) + ratio * durations[entryIndex])).toISOString();
            or7Journey.position.cartographicDegrees.push(iDate)
          }
          cumD += calcDistance(prevCoord, or7Coord);
          updateStats(iDate, cumD, or7Coord[2]);
          prevCoord = or7Coord;
          or7Journey.position.cartographicDegrees.push(or7Coord[0]);
          or7Journey.position.cartographicDegrees.push(or7Coord[1]);
          or7Journey.position.cartographicDegrees.push(0);
          corridorItem.corridor.positions.cartographicDegrees.push(or7Coord[0]);
          corridorItem.corridor.positions.cartographicDegrees.push(or7Coord[1]);
          corridorItem.corridor.positions.cartographicDegrees.push(0);
          corridorOutlineItem.corridor.positions.cartographicDegrees.push(or7Coord[0]);
          corridorOutlineItem.corridor.positions.cartographicDegrees.push(or7Coord[1]);
          corridorOutlineItem.corridor.positions.cartographicDegrees.push(0);
        });
        or7CZML.push(corridorOutlineItem);
        or7CZML.push(corridorItem);
      }
      if (or7f.geometry.type === 'Polygon') {
        var polygonOutlineItem = new PolygonOutlineItem(itemId++, or7f.properties);
        var labelItem = new LabelItem(itemId++, or7f.properties);
        polygonOutlineItem.position.cartographicDegrees.push(or7f.geometry.coordinates[0][0][0], or7f.geometry.coordinates[0][0][1], or7f.geometry.coordinates[0][0][2]);
        labelItem.position.cartographicDegrees.push(or7f.geometry.coordinates[0][0][0], or7f.geometry.coordinates[0][0][1], or7f.geometry.coordinates[0][0][2]);
        or7f.geometry.coordinates[0].forEach(function(or7Coord) {
          polygonOutlineItem.corridor.positions.cartographicDegrees.push(or7Coord[0]);
          polygonOutlineItem.corridor.positions.cartographicDegrees.push(or7Coord[1]);
          polygonOutlineItem.corridor.positions.cartographicDegrees.push(0);
        });
        or7CZML.push(polygonOutlineItem);
        or7CZML.push(labelItem);
      }
    });

    fixStats();

    or7CZML.push(or7Journey);
    callback(or7CZML);
  });
}

function calcDuration(d1, d2) {
  return Date.parse(d1) - Date.parse(d2);
}

function calcDistance(p1, p2) {
  return Cesium.Cartesian3.distance(Cesium.Cartesian3.fromDegrees(p1[0], p1[1]), Cesium.Cartesian3.fromDegrees(p2[0], p2[1]));
}

function isSameCoordinates(c1, c2) {
  return ((c1[0] === c2[0]) && (c1[1] === c2[1]));
}

function initStats(fromDate, toDate) {
  statsAll = {labels: [], samples: [], distanceData: [], elevationData: [], maxElevation: [], minElevation: [], labelIndices: {}};
  var fromYear = parseInt(fromDate.substring(0, 4));
  var toYear = parseInt(toDate.substring(0, 4));
  var fromMonth = parseInt(fromDate.substring(5, 7));
  var toMonth = parseInt(toDate.substring(5, 7));

  function pushStat(m, y) {
    statsAll.labels.push(m + '/' + y);
    statsAll.samples.push(0);
    statsAll.distanceData.push(0);
    statsAll.elevationData.push(0);
    statsAll.maxElevation.push(0);
    statsAll.minElevation.push(Infinity);
    statsAll.labelIndices[statsAll.labels[statsAll.labels.length-1]] = statsAll.labels.length-1;
  }

  for (var y=fromYear; y<=toYear; y++) {
    for (var m=1; m<=12; m++) {
      if (y === fromYear) {
        if (m >= fromMonth) {pushStat(m, y);}
      } else {
        if (y === toYear) {
          if (m <= toMonth) {pushStat(m, y);}
        } else {
          pushStat(m, y);
        }
      }
    }
  }
}

function updateStats(date, distance, elevation) {
  elevation = elevation * 3.28084;
  var label = parseInt(date.substring(5, 7)) + '/' + parseInt(date.substring(0, 4));
  var idx = statsAll.labelIndices[label];
  statsAll.samples[idx]++;
  statsAll.distanceData[idx] = distance/1609.34;
  statsAll.elevationData[idx] += elevation;
  statsAll.maxElevation[idx] = (statsAll.maxElevation[idx] > elevation) ? statsAll.maxElevation[idx] : elevation;
  statsAll.minElevation[idx] = (statsAll.minElevation[idx] < elevation) ? statsAll.minElevation[idx] : elevation;

}

function fixStats() {
  for (var i=0; i<statsAll.distanceData.length; i++) {
    if (statsAll.samples[i] > 0) {
      statsAll.elevationData[i] = statsAll.elevationData[i] / statsAll.samples[i];
    }
    if (i>0 && statsAll.distanceData[i] === 0) {
      statsAll.distanceData[i] = statsAll.distanceData[i-1];
      statsAll.elevationData[i] = statsAll.elevationData[i-1];
      statsAll.maxElevation[i] = statsAll.maxElevation[i-1];
      statsAll.minElevation[i] = statsAll.minElevation[i-1];
    }
    statsAll.distanceData[i] = Number(statsAll.distanceData[i]).toFixed();
    statsAll.elevationData[i] = Number(statsAll.elevationData[i]).toFixed();
    statsAll.maxElevation[i] = Number(statsAll.maxElevation[i]).toFixed();
    statsAll.minElevation[i] = Number(statsAll.minElevation[i]).toFixed();
  }
}

export function restoreView() {

}

export function wipeoutView() {
  $('#viewLabel').empty();
  $('#viewLabel').hide();
  $('#infoPanel').empty();
  $('#summaryChartContainer').empty();
  $('#viewPhotosContainer').empty();

  $('#viewPhotosControl').hide();
  $('#viewPhotosControl').off();

  viewerCallbacks.forEach(function(removeCallback) {
    if (removeCallback) {
       removeCallback();
    }
  });
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');

  _viewer.dataSources.remove(or7dataSource, true);
  _viewer.dataSources.remove(or7kmlDataSource, true);
  _viewer.dataSources.remove(or7plDataSource, true);
  _viewer.dataSources.remove(or7wDataSource, true);
  _viewer.imageryLayers.remove(or7StoryMapLayer);

  _viewer.entities.removeAll();

  or7data = or7dataSource = or7kmlDataSource = or7plDataSource = or7wDataSource = or7StoryMapLayer = statsAll = undefined;

}

function setUpSummaryChart() {
  var ctx = $('#summaryChart')[0];

  var datasets = [
    {
      type: 'line',
      label: 'Distance',
      yAxisID: 'miles',
      data: statsAll.distanceData,
      backgroundColor: 'rgba(255, 217, 204, 0.3)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1
    },
    {
      type: 'line',
      label: 'Avg Elevation',
      yAxisID: 'feet',
      data: statsAll.elevationData,
      backgroundColor: 'rgba(204, 255, 242, 0.8)',
      borderColor: 'rgba(169, 169, 169, 1)',
      borderWidth: 1
    }
  ]

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: statsAll.labels,
      datasets: datasets
    },
    options: {
      scales: {
        yAxes: [{
          position: 'left',
          id: 'miles',
          ticks: {beginAtZero:true},
          scaleLabel: {
            display: true,
            labelString: 'Distance in miles'
          }
        }, {
          position: "right",
          id: 'feet',
          ticks: {beginAtZero:true},
          scaleLabel: {
            display: true,
            labelString: 'Average elevation in feet'
          }
        }]
      }
    }
  });

}
