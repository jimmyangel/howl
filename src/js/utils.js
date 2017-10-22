/* global Cesium  */
'use strict';
import {config} from './config.js';

export function getFireExclusionList(data, threshold) {
  var fireExclusionList = [];
  data.features.reduce(function(a, c) {
    if (c.properties.forestAcres/c.properties.acres < threshold/100) {
      a.push(c.properties.id);
    }
    return a;
  }, fireExclusionList);
  return fireExclusionList;
}

export function getUrlVars() {
	var urlVars = [];
	var varArray = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for (var i = 0; i < varArray.length; i++) {
		var urlVar = varArray[i].split('=');
		urlVars[urlVar[0]] = urlVar[1];
	}
	return urlVars;
}

export function isWebGlSupported() {
	// Basic test
	if (!window.WebGLRenderingContext) {
		return false;
	}
	// Ok basic test passed, but can WebGL be initialized?
	var c = document.createElement('canvas');
	var webglOptions = {
		alpha : false,
		stencil : false,
		failIfMajorPerformanceCaveat : true
	};
	var gl = c.getContext('webgl', webglOptions) || c.getContext('experimental-webgl', webglOptions) || undefined;
	if (!gl) {
		return false;
	}
	// This will catch some really crappy versions like IE on virtualized environment
	if (gl.getSupportedExtensions().indexOf('OES_standard_derivatives') < 0) {
		return false;
	}
	// If I got here, it WebGL "should" be supported
	return true;
}

export function setupPlaybackControlActions(animationViewModel, clockViewModel) {
  clockViewModel.synchronize();
  updateSpeedLabel(clockViewModel);
  $('#pb-play').click(function() {
    if ($('#pb-play span').hasClass('glyphicon-play')) {
      // If play pushed at the end of the interval, force start over (needed for CLAMPED)
      if (clockViewModel.currentTime.equals(clockViewModel.stopTime)) {
        clockViewModel.currentTime = clockViewModel.startTime;
      }
      animationViewModel.playForwardViewModel.command();
    } else {
      animationViewModel.pauseViewModel.command();
    }
    $('#pb-play span').toggleClass('glyphicon-pause glyphicon-play');
    $('#pb-play span').toggleClass('blink');
    // animationViewModel.playForwardViewModel.command();
    $(this).blur();
    return false;
  });

  $('#pb-faster').click(function() {
    speedUpAnimation(clockViewModel, 2)
    $(this).blur();
    return false;
  });

  $('#pb-slower').click(function() {
    slowDownAnimation(clockViewModel, 2)
    $(this).blur();
    return false;
  });

  $('#pb-start').click(function() {
    clockViewModel.currentTime = clockViewModel.startTime;
    setPlaybackPauseMode();
    //updateTimePeriodLabel(statsAll.fromYear);
    $(this).blur();
    return false;
  });

  $('#pb-end').click(function() {
    clockViewModel.currentTime = clockViewModel.stopTime;
    setPlaybackPauseMode();
    $(this).blur();
    return false;
  });

  // Keyboard events
  $(document).off('keydown');
  $(document).keydown(function (e) {
    switch (e.which) {
      case 32: // Spacebar
        $('#pb-play').click();
        e.preventDefault();
        break;
      case 37: // Left arrow
        $('#pb-start').click();
        break;
      case 38: // Up arror
        $('#pb-faster').click();
        break;
      case 39: // Right arrow
        $('#pb-end').click();
        break;
      case 40: // Down arrow
        $('#pb-slower').click();
        break;
    }
  });

}

export function speedUpAnimation(clockViewModel, factor) {
  clockViewModel.multiplier = factor * clockViewModel.multiplier;
  updateSpeedLabel(clockViewModel);
}

export function slowDownAnimation(clockViewModel, factor) {
  clockViewModel.multiplier = clockViewModel.multiplier / factor;
  updateSpeedLabel(clockViewModel);
}

export function setPlaybackPauseMode() {
  if ($('#pb-play span').hasClass('glyphicon-pause')) {
    $('#pb-play').click();
  }
}

function updateSpeedLabel(clockViewModel) {
  $('#secsperyear').text((31556926/clockViewModel.multiplier).toFixed(2));
}

export function setUpResetView(viewer, target) {
  $('#resetView').off();
  $('#resetViewDown').off();
  $('#resetView').click(function() {
    if (target) {
      viewer.flyTo(target);
    } else {
      viewer.camera.flyTo(config.resetViewTarget.default)
    }
    $(this).blur();
    $('#track-entity-option').prop('checked', false);
    return false;
  });
  $('#resetViewDown').click(function() {
    if (target) {
      viewer.flyTo(target, {offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90))});
    } else {
      viewer.camera.flyTo({destination: config.resetViewTarget.lookDownDestinaton, orientation: {heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0}});
    }
    $(this).blur();
    $('#track-entity-option').prop('checked', false);
    return false;
  });
}

// Code from MDN to decode unicode strings
export function b64DecodeUnicode(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''));
}

export var cursor = {
  default: '',
  saved: ''
}

export var locationPickEnabled = false;

export function enableLocationPickMode() {
  locationPickEnabled = true;
  $('#cesiumContainer').css('cursor', 'crosshair');
  cursor.saved = 'crosshair';
}

export function disableLocationPickMode() {
  locationPickEnabled = false;
  cursor.saved = cursor.default;
  $('#cesiumContainer').css('cursor', cursor.default);
}
