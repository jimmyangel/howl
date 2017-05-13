'use strict';
import {config} from './config.js';
import * as utils from './utils.js';

var currentViewName;
var isHomeReady = false;
var _viewer;

export var viewdispatcher = {
  setup: function(viewer) {
    var self = this;
    _viewer = viewer;
    window.onpopstate = function(event) {
      var viewName = utils.getUrlVars().view;
      console.log('popstate', viewName);
      self.dispatch((viewName ? viewName : 'home'), false);
    };
  },
  dispatch: function(viewName, pushFlag) {
    console.log(currentViewName, viewName);
    var view = require('./views/' + viewName + '.js');
    if (viewName === 'home') {
      $('#viewContainer').hide();
      $('#homeContainer').show();
      if (isHomeReady) {
        view.restoreView();
      } else {
        view.setupView(_viewer);
        isHomeReady = true;
      }
    } else {
      $('#homeContainer').hide();
      $('#viewContainer').show();
      if (viewName === currentViewName) {
        view.restoreView();
      } else {
        console.log('about to wipeout', currentViewName);
        if (currentViewName) {
          require('./views/' + currentViewName + '.js').wipeoutView();
        }
        view.setupView(_viewer);
        currentViewName = viewName;
      }
    }
    if (pushFlag) {
      history.pushState('', '', (viewName === 'home' ? '' : '?view=' + viewName));
    }
  },
  getCurrentViewName: function() {
    return currentViewName;
  }
};
