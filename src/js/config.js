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
  baseMapLayers: [
    {
      layerName: 'ESRI World Imagery',
      layerUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
      default3D: true
    },
    {
      layerName: 'ESRI World Topo',
      layerUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles © Esri — Source: <a href="http://www.arcgis.com/home/item.html?id=30e5fe3149c34df1ba922e6f5bbf808f">ArcGIS World Topographic Map</a>',
      maxZoom: 19
    },
    {
      layerName: 'Thunder Forest Outdoors',
      layerUrl: 'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png',
      attribution: '© <a href="http://www.opencyclemap.org">OpenCycleMap</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 17
    },
    {
      layerName: 'OpenStreetMap',
      layerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    },
    {
      layerName: 'USGS USA Topo',
      layerUrl: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
      attribution: '<a href="https://www.doi.gov">U.S. Department of the Interior</a> | <a href="http://www.usgs.gov">U.S. Geological Survey</a> | <a href="http://www.usgs.gov/laws/policies_notices.html">Policies</a>',
      maxZoom: 15
    },
    {
      layerName: 'ArcGIS USA Topo Maps',
      layerUrl: 'https://services.arcgisonline.com/arcgis/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, DeLorme, FAO, USGS, NOAA, EPA | © 2013 National Geographic Society, i-cubed',
      maxZoom: 15
    }
    ]
}
