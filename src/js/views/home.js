'use strict';
//import {config} from '../config.js';
import {viewdispatcher} from '../viewdispatcher.js';

import homeContent from '../../templates/home/homeContent.hbs';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';

var masonry;

export function setupView (view) {
  $('#homeContainer').html(homeContent());
  viewdispatcher.setUpSocialButtons('Highlighting Oregon\'s WildLands');

  imagesLoaded( '.grid', function() {
    masonry = new Masonry( '.grid', {
      //initLayout: false,
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      transitionDuration: '.5s',
      fitWidth: true,
      gutter: 0
    });
    masonry.on('layoutComplete', function() {
      $('.grid').css({'animation':'fadeIn ease-in 1', 'animation-duration':'.5s'});
      $('.grid').css({'opacity':'1'});
    });
    masonry.layout();

  });

  $('#homeContainer').show();
  if (view) {
    $('.homeViewLinkItem').click(function() {
      $('#homeContainer').hide();
      var viewName = $(this).attr('view');
      viewdispatcher.dispatch(viewName, true);
      return false;
    });
  } else {
    $('#noWebGLMessage').show();
    $('.homeViewLinkItem').click(function() {
      return false;
    });
  }
  //history.pushState('', '');
}

export function restoreView() {
  masonry.layout();
}
