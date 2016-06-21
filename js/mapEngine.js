'use strict';

var mapEngine = {
	options: {
		center: [42.221256, 2.168770],
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
		})
			.setView(this.options.center, this.options.zoom);


		this.directionsAPI = L.tc.DirectionsAPI({
			mapBoxApiKey: this.options.mapBoxApiKey
		});

		this.intersectionsAPI = L.tc.IntersectionsAPI(this.map);

		this.routeLayer = L.tc.RouteLayer(this.directionsAPI, this.intersectionsAPI).addTo(this.map);

		this.setupGeocoding();

		$("#btnFinishTrail").on('click', $.proxy(this.saveTrail, this));

	},
	setSnap: function(snap) {
		this.routeLayer.options.snap2roads = snap;
	},
	setupGeocoding: function() {
		this.geocoder = L.mapbox.geocoder('mapbox.places');

		$("#tbxSearch").autocomplete({
			minChars: 3,
			lookup: $.proxy(this.geocoderLookup, this),
			onSelect: $.proxy(this.geocoderSelect, this),
			deferRequestBy: 150,
			width: 210
		});
	},
	geocoderLookup: function(query, done) {
		var results = {
			suggestions: []
		};

		this.geocoder.query(query, function(err, data) {
			if (err)
				return done();
			if (data && data.results && data.results.features && data.results.features.length) {
				results.suggestions = data.results.features.map(function(item) {
					return {
						value: item.text,
						data: item
					};
				});				
				done(results);
			}
		});		
	},
	geocoderSelect: function(data) {
		var data = data.data;
		if (data.bbox) {
			var b = L.latLngBounds(L.latLng(data.bbox[1], data.bbox[0]), L.latLng(data.bbox[3], data.bbox[2]));
			this.map.fitBounds(b);
		} 
		if (data.center) {
			this.map.setView([data.center[1], data.center[0]], this.map.getZoom());
		}
	},

	saveTrail: function() {
		var data = this.routeLayer.getRouteForSave();
	}
};


$(function() {
	mapEngine.init();

	$("#cbxSnap2Roads").on('change', function() {
		mapEngine.setSnap($(this).is(":checked"));
	});
});

//from here https: //davidwalsh.name/javascript-debounce-function
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this,
			args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};