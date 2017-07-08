/* global Cesium  */
'use strict';

export var config = {
  versionString: 'v0.5.1<sup>Beta</sup>',
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
  ]
}
