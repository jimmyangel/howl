/* global Cesium  */
'use strict';

export var config = {
  bingAPIKey: 'AmN4YMNTJKsD0E-WG0AG935u5Cb1g92Z8SyCa1F-sJFAUppvyEMUJUrO2F-boadU',
  mapboxAccessToken: 'pk.eyJ1IjoiamltbXlhbmdlbCIsImEiOiJjaW5sMGR0cDkweXN2dHZseXl6OWM4YnloIn0.v2Sv_ODztWuLuk78rUoiqg',
  initialCameraView: {
    destination: Cesium.Cartesian3.fromDegrees(-120.84, 39.44, 460000),
    orientation : {
      heading : 6.28,
      pitch : -0.85,
      roll : 6.28
    }
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
      name: 'Old Growth Forests',
      alpha: 0.8,
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
      name: 'Clearcuts in Federal Lands',
      legendSpan: '<span class="overlay-legend-item-stripes"></span>'
    },
    {
      provider:
        new Cesium.ArcGisMapServerImageryProvider(
          {
            url: 'http://services.cfc.umt.edu/arcgis/rest/services/ProctectedAreas/Wilderness/MapServer',
            layers: '2'
          }
        ),
      name: 'Wilderness Areas',
      alpha: 0.7,
      legendSpan:
        '<span class="overlay-legend-item" style="background:#FFFF02;"></span><span style="font-size: 80%; font-weight: 100;"> BLM </span>' +
        '<span class="overlay-legend-item" style="background:#FFA900;"></span><span style="font-size: 80%; font-weight: 100;"> FWS </span>' +
        '<span class="overlay-legend-item" style="background:#38A801;"></span><span style="font-size: 80%; font-weight: 100;"> FS </span>' +
        '<span class="overlay-legend-item" style="background:#A80085;"></span><span style="font-size: 80%; font-weight: 100;"> NPS </span>'
    }
  ]
}
