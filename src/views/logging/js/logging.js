/* global Cesium  */
'use strict';

import Chart from 'chart.js';

import {config} from './loggingConfig.js';
import {viewdispatcher} from '../../../js/viewdispatcher.js';
import * as data from '../../../js/data.js';
import * as utils from '../../../js/utils.js';

import iframePanel from '../templates/iframePanel.hbs';


export function setupView (viewer) {
  console.log('setupview');

  $('#iframePanel').html(iframePanel());
  $('#viewContainer').show();
  $('#summary-btn').hide();
  $('#help-btn').hide();
  $('#contentPanel').hide();
  $('#externalPanel').show();
  $('iframe').on('load', function() {
    viewdispatcher.cleanUrl();
  });
}

export function restoreView() {
  console.log('restoreview');
}

export function wipeoutView() {
  $('#iframePanel').empty();
  $('#externalPanel').hide();
  $('#contentPanel').show();
  $('#summary-btn').show();
  $('#help-btn').show();
}

function setUpSummaryChart() {
  console.log('summarychart');
}
