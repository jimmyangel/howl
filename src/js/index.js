'use strict';
import '../favicon.ico';
import '../CNAME';

import 'bootstrap';
import {config} from './config.js';
var allViewsConfig = require('../views/allViewsConfig.json');

import * as mapper from './mapper.js';
import * as utils from './utils.js';
import * as user from './user.js';

import spotlightDropDown from '../templates/spotlightDropDown.hbs';
import navigationBar from '../templates/navigationBar.hbs';
import helpModal from '../templates/helpModal.hbs';
import aboutModal from '../templates/aboutModal.hbs';
import summaryModal from '../templates/summaryModal.hbs';
import contentPanel from '../templates/contentPanel.hbs';

import loginModal from '../templates/loginModal.hbs';
import userModal from '../templates/userModal.hbs';

//import * as firebase from 'firebase/app';
//import 'firebase/auth';

//firebase.initializeApp(config.firebaseConfig);

// Attach static HTML content
$('#navigationBar').html(navigationBar());
$('#helpModal').html(helpModal());
$('#aboutModal').html(aboutModal({version: config.versionString}));
$('#summaryModal').html(summaryModal());
$('#contentPanel').html(contentPanel());
$('#loginModal').html(loginModal());
$('#userModal').html(userModal());

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

$('#about-btn').on('contextmenu', function() {
  //var user = firebase.auth().currentUser;
  if (user.currentUser) {
    $('#hi-username').text(user.currentUser);
    $('#userModal').modal('show');
  } else {
    $('#loginModal').modal('show');
  }
  return false;
});

$('#loginButton').click(function() {
  var username = $('#login-username').val();
  var password = $('#login-password').val();
  user.login(username, password).then(function() {
    $('#about-icon').addClass('login-active');
    resetLoginDialog();
  }, function() {
    $('#about-icon').removeClass('login-active');
    $('#loginErrorText').text('Unable to login to Github, please check your credentials');
    $('#loginError').show();
  });
  return false;
});

$('#logoffLink').click(function () {
  utils.disableLocationPickMode();
  user.logoff();
  $('#about-icon').removeClass('login-active');
  $('#userModal').modal('hide');
  return false;
});

function resetLoginDialog() {
  $('#loginModal').modal('hide');
  $('#loginModal').find('form').trigger('reset');
  $('#loginErrorText').text('');
  $('#loginError').hide();
}

// Set up spotlight dropdown
$('#spotlightDropDown').html(spotlightDropDown({labels: allViewsConfig.viewLabels}));

if (utils.isWebGlSupported()) {
  console.log('webgl is supported');
  var viewName = utils.getUrlVars().view;

  if (!allViewsConfig.views.includes(viewName)) {
    viewName = allViewsConfig.views[0]; // Default view
  }
  mapper.setup3dMap(viewName);
} else {
  // Go directly to home page with no WebGL support
  require('../views/home/js/home.js').setupView();
}
