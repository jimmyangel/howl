'use strict';
//import {config} from '../config.js';

export function setupView (viewer) {
  console.log('Home view...');
  $('#homeContainer').show();
  $('.homeViewLinkItem').click(function() {
    console.log('goto', $(this).attr('view'));
    $('#homeContainer').hide();
    var view = require('../views/' + $(this).attr('view') + '.js');
    view.setupView(viewer);
    return false;
  });
  history.pushState({view: 'home'}, '', ' ');
}

export function restoreView(state) {
  console.log('Restore home view...');
}
