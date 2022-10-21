'use strict';

import {viewdispatcher} from '../../../js/viewdispatcher.js';

import iframePanel from '../templates/iframePanel.hbs';


export function setupView () {
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

}

export function wipeoutView() {
  $('#iframePanel').empty();
  $('#externalPanel').hide();
  $('#contentPanel').show();
  $('#summary-btn').show();
  $('#help-btn').show();
}
