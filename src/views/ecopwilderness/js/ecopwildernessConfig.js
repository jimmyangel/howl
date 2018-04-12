'use strict';

import {defaultDataPathBaseUrl} from '../../../js/config.js';

export var config = {
  dataPaths: {
    ecoregions: defaultDataPathBaseUrl + '/pwildbyeco/ecoregions.json',
    pwilderness: defaultDataPathBaseUrl + '/pwildbyeco/'
  },
  ecoRegionColors: {
    'Coast Range': {label: 'Coast Range', color: '#ABB9D1', lon: -123.81, lat: 43.68},
    'Columbia Plateau': {label: 'Columbia Plateau', color: '#FF741A', lon: 0, lat: 0},
    'Blue Mountains': {label: 'Blue Mountains', color: '#CDD4A7', lon: -118.95, lat: 44.85},
    'Snake River Plain': {label: 'Snake River Plain', color: '#E89B6F', lon: 0, lat: 0},
    'Willamette Valley': {label: 'Willamette Valley', color: '#B57F22', lon: -123.01, lat: 45.13},
    'Cascades': {label: 'Cascades', color: '#7CBA82', lon: -122.52, lat: 43.54},
    'Klamath Mountains/California High North Coast Range': {label: 'Klamath Mountains', color: '#C4EF83', lon: -123.36, lat: 42.40},
    'Northern Basin and Range': {label: 'Northern Basin and Range', color: '#FECA50', lon: 0, lat: 0},
    'Eastern Cascades Slopes and Foothills': {label: 'Eastern Cascades', color: '#98A162', lon: -121.27, lat: 42.61}
  }
}
