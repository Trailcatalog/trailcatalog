'use strict';

var tcDirectionsAPI = L.Class.extend({
	initialize: function(options) {
		L.setOptions(this, options);
	},

	getRoute: function(points, callback) {
		if (points && points.length && points.length > 1) {
			var directionsUrl = this._getDirectionsAPIUrl(points);
			$.get(directionsUrl)
				.success(function(data) {
					var result = [];
					if (data.routes.length > 0) {
						var decodedArray = polyline.decode(data.routes[0].geometry);

						for (var j = 0; j < decodedArray.length; j++) {
							var newPointLatLng = [decodedArray[j][0] / 10, decodedArray[j][1] / 10];
							result.push(new L.LatLng(newPointLatLng[0], newPointLatLng[1]));
						}
					}					
					callback(null, result);
				})
				.error(function(data) {
					return callback(data);
				});
		} else {
			return callback('No points');
		}
	},

	_getDirectionsAPIUrl: function(pointsArray) {
		var urlString = '';
		for (var i = 0; i < pointsArray.length; i++) {
			if (urlString.length > 0) {
				urlString += ';';
			}
			urlString += pointsArray[i].lng + ',' + pointsArray[i].lat;
		}

		//var returnString = 'https://api.mapbox.com/directions/v5/mapbox/walking/' + urlString + '?access_token=' + this.options.mapBoxApiKey + '&geometries=polyline';
		var returnString = 'https://api.tiles.mapbox.com/v4/directions/mapbox.walking/' + urlString + '.json?access_token=' + this.options.mapBoxApiKey + '&steps=false&geometry=polyline';
		return returnString;
	}
});

L.tc = L.tc || {};

L.tc.DirectionsAPI = function(options) {
	return new tcDirectionsAPI(options);
}