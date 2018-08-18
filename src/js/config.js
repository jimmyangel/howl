/* global Cesium  */
'use strict';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwMzE3NzI4MC1kM2QxLTQ4OGItOTRmMy1jZjNiMzgyZWNjMTEiLCJpZCI6ODMxLCJpYXQiOjE1MjU5Nzg4MDN9.Aw5ul-R15-PWF1eziTS9fOffIMjm02TL0eRtOD59v2s';
var mapboxAccessToken = 'pk.eyJ1IjoiamltbXlhbmdlbCIsImEiOiJjaW5sMGR0cDkweXN2dHZseXl6OWM4YnloIn0.v2Sv_ODztWuLuk78rUoiqg';

export var defaultDataPathBaseUrl = 'https://stable-data.oregonhowl.org';
export var defaultDynDataPathBaseUrl = 'https://data.oregonhowl.org';
export var GLOBAL_K = {
  FOREST_PERCENTAGE_THRESHOLD: 5
}

export var config = {
  versionString: 'v0.9.6<sup>Beta</sup>',
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
        new Cesium.MapboxImageryProvider(
          {
            mapId: 'mapbox.landsat-live',
            accessToken: mapboxAccessToken,
            maximumLevel: 12,
            credit: 'Mapbox Landsat Live'
          }
        ),
      name: 'Landsat Live'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'https://tiles.oregonhowl.org/oldgrowth/{z}/{x}/{y}.png',
            maximumLevel: 12,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5685,41.9595,-120.8112,45.9053),
            credit: 'Oregon Wild'
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
            url: 'https://tiles.oregonhowl.org/clearcuts/{z}/{x}/{y}.png',
            maximumLevel: 12,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5026,41.9513,-116.7792,46.0275),
            credit: 'Oregon Wild'
          }
        ),
      name: 'Clearcuts on Federal Lands',
      legendSpan: '<span class="overlay-legend-item-stripes"></span>'
    },
    {
      provider:
        new Cesium.UrlTemplateImageryProvider(
          {
            url: 'https://tiles.oregonhowl.org/wilderness/{z}/{x}/{y}.png',
            maximumLevel: 13,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5383,41.8818,-116.4359,46.0237),
            credit: 'Oregon Wild'
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
            url: 'https://tiles.oregonhowl.org/pwilderness/{z}/{x}/{y}.png',
            maximumLevel: 13,
            rectangle : Cesium.Rectangle.fromDegrees(-124.5383,41.8818,-116.4359,46.0237),
            credit: 'Oregon Wild'
          }
        ),
      name: 'Potential Forest Wilderness Areas',
      alpha: 0.9,
      legendSpan: '<span class="overlay-legend-item-gstripes"></span>'
    } /*,
    {
      provider:
        new Cesium.ArcGisMapServerImageryProvider(
          {
            url: 'https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer',
            rectangle : Cesium.Rectangle.fromDegrees(-124.5383,41.8818,-116.4359,46.0237),
            layers: '1',
            enablePickFeatures: false
          }
        ),
      name: 'Active Wildfires (<small><a href="https://www.geomac.gov/" target="_blank">GeoMAC</a></small>)',
      //alpha: 0.9,
      legendSpan: '<span class="overlay-legend-item" style="background:#FEFE01;"></span><small> Single</small><span class="overlay-legend-item" style="background:#CCFE36;"></span><small> Complex</small>'
    } */
  ],
  dataPaths: {
    stateBoundary: defaultDataPathBaseUrl + '/oregon/oregonl.json',
    stateForestLand: defaultDataPathBaseUrl + '/oregon/forestland.topojson'
  },
  stateBoundaryOpts: {
    strokeWidth: 2000,
    strokeColor: '#474747',
    strokeOpacity: 0.7
  },
  githubInfo: {
    owner : 'oregonhowl',
    repo: 'githubd'
  }
}
