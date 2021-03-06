'use strict';

var mapEngine = {
	options: {
		zoom: 6,
		tileLayerName: 'mapbox.outdoors',
		mapContainerId: 'map',
		center: [47.50, -120],
		mapBoxApiKey: 'pk.eyJ1Ijoicm9tYW5wIiwiYSI6ImF6eXlJTmcifQ.c8lx6qJoMa_apYeZvh34Sw'
	},

	init: function(options) {
		L.setOptions(this, options);
		L.mapbox.accessToken = this.options.mapBoxApiKey;
		this.map = L.mapbox.map(this.options.mapContainerId, this.options.tileLayerName, {
			zoomControl: false
		});

		this.routeLayer = L.tc.StaticRouteLayer().addTo(this.map);

		if (typeof trailData !== "undefined") {
			this.restoreTrail();
		}

		$(".button-delete a").on('click', $.proxy(this.deleteTrail, this));
	},

	restoreTrail: function() {
		this.routeLayer.restoreRouteFromJSON(trailData, this.map);
	},

	deleteTrail: function(e) {
		var id = $(e.target).data('id');
		var hash = $(e.target).data('hash');
		
		$.ajax({
			url: '/api/deletetrail/' + id,
			type: 'post',
			data: JSON.stringify({
				hash: hash
			}),
			contentType: 'application/json'
		}).success(function(result) {
			window.location.href = "/";
		});		
	}
};

$(function() {
	mapEngine.init();
});