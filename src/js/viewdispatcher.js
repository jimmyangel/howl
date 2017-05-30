'use strict';
import * as utils from './utils.js';

var currentViewName;
var isHomeReady = false;
var _viewer;

export var viewdispatcher = {
  setup: function(viewer) {
    var self = this;
    _viewer = viewer;
    window.onpopstate = function() {
      var viewName = utils.getUrlVars().view;
      console.log('popstate', viewName);
      self.dispatch((viewName ? viewName : 'home'), false);
    };
    $('.spotlightDropDownItem').click(function(event) {
      var viewTarget = $(this).attr('view');
      event.toElement.parentElement.click(); // Close dropdown
      if (viewTarget != currentViewName) {
        viewdispatcher.dispatch(viewTarget, true);
      }
      return false;
    });
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
        history.replaceState('', '', '.');
        view.setupView(_viewer);
        isHomeReady = true;
      }
    } else {
      $('#homeContainer').hide();
      $('#viewContainer').show();
      if (viewName === currentViewName) {
        view.restoreView();
      } else {
        if (currentViewName) {
          $('.leaflet-popup-close-button').click();
          require('./views/' + currentViewName + '.js').wipeoutView();
        }
        $('.spotlightDropDownItem[view="' + currentViewName + '"] span').removeClass('glyphicon-ok');
        $('.spotlightDropDownItem[view="' + viewName + '"] span').addClass('glyphicon-ok');
        view.setupView(_viewer);
        currentViewName = viewName;
      }
    }
    if (pushFlag) {
      history.pushState('', '');
      //history.pushState('', '', (viewName === 'home' ? '' : '?view=' + viewName));
    }
  },
  getCurrentViewName: function() {
    return currentViewName;
  }
};
