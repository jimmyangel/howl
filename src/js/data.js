'use strict';

export function getJSONData (path, successCallback, errorCallback) {
  $.getJSON(path, successCallback).fail(errorCallback);
}
