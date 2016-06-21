'use strict';

var mapEngine = {
	options: {
		zoom: 15,
		tileLayerName: 'runkeeper.4nc7syvi',
		mapContainerId: 'map',
		mapBoxApiKey: 'pk.eyJ1IjoiYXJzZW55biIsImEiOiI3YkwwSGpFIn0.sz_Ar78nUbUZc6Ic1aNhkQ'
	},

	init: function(options) {
		L.setOptions(this, options);
		L.mapbox.accessToken = this.options.mapBoxApiKey;
		this.map = L.mapbox.map(this.options.mapContainerId, this.options.tileLayerName, {
			zoomControl: false
		});

		this.routeLayer = L.tc.RouteLayer(this.directionsAPI, this.intersectionsAPI).addTo(this.map);
	}
};

$(function() {
	mapEngine.init();
});