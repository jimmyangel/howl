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
  }
}
