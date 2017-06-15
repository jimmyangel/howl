'use strict';

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
      animationViewModel.playForwardViewModel.command();
    } else {
      animationViewModel.pauseViewModel.command();
    }
    $('#pb-play span').toggleClass('glyphicon-pause glyphicon-play');
    $('#pb-play span').toggleClass('blink');
    // animationViewModel.playForwardViewModel.command();
    return false;
  });

  $('#pb-faster').click(function() {
    clockViewModel.multiplier = 2 * clockViewModel.multiplier;
    updateSpeedLabel(clockViewModel);
    return false;
  });

  $('#pb-slower').click(function() {
    clockViewModel.multiplier = clockViewModel.multiplier / 2;
    updateSpeedLabel(clockViewModel);
    return false;
  });

  $('#pb-start').click(function() {
    clockViewModel.currentTime = clockViewModel.startTime;
    setPlaybackPauseMode();
    //updateTimePeriodLabel(statsAll.fromYear);
    return false;
  });

  $('#pb-end').click(function() {
    clockViewModel.currentTime = clockViewModel.stopTime;
    setPlaybackPauseMode();
    return false;
  });

}

export function setPlaybackPauseMode() {
  if ($('#pb-play span').hasClass('glyphicon-pause')) {
    $('#pb-play').click();
  }
}

function updateSpeedLabel(clockViewModel) {
  $('#secsperyear').text((31556926/clockViewModel.multiplier).toFixed(2));
}
