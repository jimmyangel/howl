/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './timberharvestConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';

import iframePanel from '../templates/iframePanel.hbs';


export function setupView (viewer) {
  console.log('setupview');

  $('#iframePanel').html(iframePanel());
  $('#viewContainer').show();
  $('#contentPanel').hide();
  $('#externalPanel').show();

  /*setTimeout(function(){
     viewdispatcher.cleanUrl();
   }, 100);*/

  viewdispatcher.cleanUrl();

}

export function restoreView() {
  console.log('restoreview');
}

export function wipeoutView() {
  console.log('wipeoutview');
}

function setUpSummaryChart() {
  console.log('summarychart');
}
