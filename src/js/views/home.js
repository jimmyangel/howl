'use strict';
//import {config} from '../config.js';
import homeContent from '../../templates/home/homeContent.hbs';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';

var masonry;

export function setupView (viewer) {
  console.log('Home view...');
  $('#homeContainer').html(homeContent());

  imagesLoaded( '.grid', function() {
    masonry = new Masonry( '.grid', {
      //initLayout: false,
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      transitionDuration: '.5s',
      fitWidth: true,
      gutter: 0
    });
    masonry.on('layoutComplete', function(items) {
      $('.grid').css({'animation':'fadeIn ease-in 1', 'animation-duration':'.5s'});
      $('.grid').css({'opacity':'1'});
    });
    masonry.layout();

  });

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
  masonry.layout();
}
