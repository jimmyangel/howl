/* global Cesium  */
'use strict';

export var config = {
  versionString: 'v0.4.0<sup>Beta</sup>',
  resetViewTarget: {
    default: {
      destination: Cesium.Cartesian3.fromDegrees(-120.84, 39.44, 460000),
      orientation : {
        heading : 6.28,
        pitch : -0.85,
        roll : 6.28
      }
    },
    lookDownDestinaton: Cesium.Cartesian3.fromDegrees(-120.84, 43.82, 600000)
  },
  spinnerOpts : {
    color: '#939393',
    opacity: 0.1,
    shadow: true
  },
  imageryProviders: [
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          }
        ),
      name: 'World Imagery'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maximumLevel: 19,
            credit: '©OpenStreetMap'
          }
        ),
      name: 'OpenStreetMap'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'https://services.arcgisonline.com/arcgis/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 15,
            credit: 'Esri, DeLorme, FAO, USGS, NOAA, EPA | © 2013 National Geographic Society, i-cubed'
          }
        ),
      name: 'USA Topo Maps'
    }
  ],
  overlayImageryProviders: [
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'data/tiles/oldgrowth/{z}/{x}/{y}.png',
            maximumLevel: 12,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5685,41.9595,-120.8112,45.9053)
          }
        ),
      name: 'Old Growth Forests on BLM Lands',
      alpha: 0.9,
      legendSpan: '<span class="overlay-legend-item" style="background:#788000;"></span>'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'data/tiles/clearcuts/{z}/{x}/{y}.png',
            maximumLevel: 12,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5026,41.9513,-116.7792,46.0275)
          }
        ),
      name: 'Clearcuts on Federal Lands',
      legendSpan: '<span class="overlay-legend-item-stripes"></span>'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'data/tiles/wilderness/{z}/{x}/{y}.png',
            maximumLevel: 13,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5383,41.8818,-116.4359,46.0237)
          }
        ),
      name: 'Wilderness Areas',
      alpha: 0.9,
      legendSpan: '<span class="overlay-legend-item" style="background:#aaee88;"></span>'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'data/tiles/pwilderness/{z}/{x}/{y}.png',
            maximumLevel: 13,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5383,41.8818,-116.4359,46.0237)
          }
        ),
      name: 'Potential Forest Wilderness Areas',
      alpha: 0.9,
      legendSpan: '<span class="overlay-legend-item-gstripes"></span>'
    }
  ],
  views: ['home', 'wildfires', 'ecopwilderness', 'or7'],
  viewLabels: {
    wildfires: 'History of Wildfire Severity',
    ecopwilderness: 'Potential Forest Wilderness Areas',
    or7: 'The Journey of Wolf OR-7'
  },
  dataPaths: {
    ecoregions: 'data/pwildbyeco/ecoregions.json',
    pwilderness: 'data/pwildbyeco/',
    or7: 'data/or7/or7F.json',
    or7StoryMapKmz: 'data/or7/or7.kmz',
    or7JourneyLog: 'data/or7/or7entriesF.json',
    or7AreasCrossed: 'data/or7/or7areascrossed.json',
    or7WolfModel: 'data/or7/model/wolf.gltf',
    or7Photos: 'data/or7/or7photos/or7photos.json',
    wildfiresList: 'data/MTBS/MTBSOregonFiresGen20170531Sampled.json',
    wildfiresFireKmz: 'data/MTBS/kmz/'
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
