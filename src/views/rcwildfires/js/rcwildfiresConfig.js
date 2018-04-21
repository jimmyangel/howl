'use strict';

import {defaultDataPathBaseUrl, defaultDynDataPathBaseUrl} from '../../../js/config.js';

export var config = {
  dataPaths: {
    rcwildfiresDataPath: defaultDataPathBaseUrl + '/rcwildfires/',
    rcwildfiresCurrentDataPath: defaultDynDataPathBaseUrl + '/rcwildfires/',
    rcwildfireRecordSuffix: 'fireRecords.json'
  },
  markerStyles: {
    fire: {
      color: '#DB4f30',
      icon: 'fire-station',
      legend: 'Logging'
    }
  },
  defaultAnimationTime: 10,
  fireSize: {
    small: {
      size: 5000,
      billboardScale: 0.6
    },
    large: {
      size: 20000,
      billboardScale: 2
    },
    medium: {
      billboardScale: 1.2
    }
  }
}
