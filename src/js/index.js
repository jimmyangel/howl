'use strict';

import 'bootstrap';
import {config} from './config.js';
var allViewsConfig = require('../views/allViewsConfig.json');

import * as mapper from './mapper.js';
import * as utils from './utils.js';

import spotlightDropDown from '../templates/spotlightDropDown.hbs';
import navigationBar from '../templates/navigationBar.hbs';
import helpModal from '../templates/helpModal.hbs';
import aboutModal from '../templates/aboutModal.hbs';
import summaryModal from '../templates/summaryModal.hbs';
import contentPanel from '../templates/contentPanel.hbs';

import loginModal from '../templates/loginModal.hbs';
import userModal from '../templates/userModal.hbs';

import * as firebase from 'firebase/app';
import 'firebase/auth';

firebase.initializeApp(config.firebaseConfig);

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

// Set up login right-click 'hidden' feature
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    $('#about-icon').addClass('login-active');
  } else {
    $('#about-icon').removeClass('login-active');
  }
});

$('#about-btn').on('contextmenu', function() {
  var user = firebase.auth().currentUser;
  if (user) {
    $('#hi-username').text(user.email);
    $('#userModal').modal('show');
  } else {
    $('#loginModal').modal('show');
  }
  return false;
});

$('#loginButton').click(function() {
  console.log('login...');
  var username = $('#login-username').val();
  var password = $('#login-password').val();
  firebase.auth().signInWithEmailAndPassword(username, password).then(function() {
    console.log('login success...');
    resetLoginDialog();
  }, function(error) {
    $('#loginErrorText').text(error.message);
    $('#loginError').show();
    console.log(error.code, error.message);
  });
  return false;
});

$('#logoffLink').click(function () {
  firebase.auth().signOut();
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
