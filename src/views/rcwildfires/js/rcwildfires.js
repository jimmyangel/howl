/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './rcwildfiresConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';
import * as user from '../../../js/user.js';

import rcwildfiresListInfoPanel from '../templates/rcwildfiresListInfoPanel.hbs';
import rcwildfiresChart from '../templates/rcwildfiresChart.hbs';

import 'magnific-popup/dist/jquery.magnific-popup.min.js';
import 'magnific-popup/dist/magnific-popup.css';

var pinBuilder = new Cesium.PinBuilder();

var _viewer;
var statsAll;
var rcwildfireListData;
var rcwildfireListDataSource;

export function setupView (viewer) {

  $('#viewContainer').show();
  window.spinner.spin($('#spinner')[0]);

  _viewer = viewer;

  $(_viewer._timeline.container).css('visibility', 'hidden');
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'hidden');
  _viewer.forceResize();

  _viewer.clock.shouldAnimate = false;
  //_viewer.scene.globe.depthTestAgainstTerrain = true;

  statsAll = {};

  data.getJSONData(config.dataPaths.rcwildfiresList, function(data) {
    rcwildfireListData = data;

    $('#infoPanel').html(rcwildfiresListInfoPanel({
      listOfFires: rcwildfireListData
    }));

    Cesium.CzmlDataSource.load(makeCZMLAndStatsForListOfRcfires(rcwildfireListData)).then(function(dataSource) {
      rcwildfireListDataSource = dataSource;

      _viewer.dataSources.add(dataSource).then(function() {

        console.log('epa', rcwildfireListDataSource);

        window.spinner.stop();
        viewdispatcher.popUpLinkClickHandler = function(id) {
          this.inViewDispatch(gotoFire.bind(this, id) , '?view=rcwildfires&fId=' + id);
        }

        utils.setUpResetView(_viewer);
        $('#resetView').click();

        viewdispatcher.cleanUrl();
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

}

function gotoAll() {

}

function gotoFire(id) {
  console.log('go to', id);
}

export function wipeoutView() {
  $('#resetView').off();
  $('#infoPanel').empty();
  $(_viewer._timeline.container).css('visibility', 'visible');
  _viewer.forceResize();
  $(_viewer.selectionIndicator.viewModel.selectionIndicatorElement).css('visibility', 'visible');
  _viewer.dataSources.remove(rcwildfireListDataSource, true);
  //cleanupDrillDown();
  rcwildfireListData = rcwildfireListDataSource = undefined;
}

function setUpSummaryChart() {


}
