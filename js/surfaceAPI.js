'use strict';

var tcSurfaceAPI = L.Class.extend({
	initialize: function(options) {
		L.setOptions(this, options);
	},

	getElevations: function(latLngs, isStraight, callback) {
		var url = '/api/ele/?';

		var locationsLimit = 30;
		// 
		
		if (latLngs.length > 30) {
			var nLL = [latLngs[0]];

			var freq = (latLngs.length - 2) / 28;

			for (var i = freq; i < latLngs.length - 1; i += freq) {
				nLL.push(latLngs[Math.round(i)]);
			}

			nLL.push(latLngs[latLngs.length - 1]);
			latLngs = nLL;
		}

		var locations = latLngs.map(function(item){
			return item.lat.toFixed(5) + "," + item.lng.toFixed(5);
		}).join('|');

		var query;

		if (!isStraight) {
			query = url + "locations=" + locations;
		}
		else {
			query = url + "path=" + locations + "&samples=20";
		}

		$.getJSON(query, function(data){
			if (data && data.status == "OK") {
				var result = data.results.map(function(item){
					return item.elevation;
				});

				callback(null, result);
			} else {
				return callback("err");
			}
		});
	}
});

L.tc = L.tc || {};

L.tc.SurfaceAPI = function(options) {
	return new tcSurfaceAPI(options);
}