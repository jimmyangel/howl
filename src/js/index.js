'use strict';

import 'bootstrap';
import {config} from './config.js';
import * as mapper from './mapper.js';
import * as utils from './utils.js';

import spotlightDropDown from '../templates/spotlightDropDown.hbs';

// Set up about button
$('#about-btn').click(function() {
  $('#aboutModal').modal('show');
  return false;
});

// Set up help button
$('#help-btn').click(function() {
  $('#helpModal').modal('show');
  return false;
});

// Set up spotlight dropdown
$('#spotlightDropDown').html(spotlightDropDown({labels: config.viewLabels}));

if (utils.isWebGlSupported()) {
  console.log('webgl is supported');
  var viewName = utils.getUrlVars().view;

  if (!config.views.includes(viewName)) {
    viewName = config.views[0]; // Default view
  }
  mapper.setup3dMap(viewName);
} else {
  // Go directly to home page with no WebGL support
  require('./views/home.js').setupView();
}
