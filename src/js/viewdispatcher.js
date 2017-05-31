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
      if ((viewTarget != currentViewName) && (viewTarget != 'home')) {
        viewdispatcher.dispatch(viewTarget, true);
      }
      return false;
    });
    this.setUpSocialButtons('Highlighting Oregon\'s WildLands');
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
  },
  setUpSocialButtons: function(text) {
    var options = 'top=' + ((window.innerHeight / 2) - (350 / 2)) + ',left='+ ((window.innerWidth / 2) - (520 / 2)) + ',toolbar=0,status=0,width=' + 520 + ',height=' + 350;
    $('.btn-twitter').off().click(function() {
      this.blur();
      window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(window.location.href) + '&via=jimmieangel' + '&hashtags=oregonhowl',
      'Share on twitter', options);
       return false;
    });
    $('.btn-facebook').off().click(function() {
      this.blur();
      window.open('https://www.facebook.com/sharer/sharer.php?p[url]=' + encodeURIComponent(window.location.href),
      'Share on facebook', options);
      return false;
    });
  }
};
