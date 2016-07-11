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
		this.surfaceAPI = L.tc.SurfaceAPI();

		this.routeLayer = L.tc.RouteLayer(this.directionsAPI, this.intersectionsAPI, this.surfaceAPI).addTo(this.map);

		this.setupGeocoding();

		$("#btnFinishTrail").on('click', $.proxy(this.saveTrail, this));
		$("#btnClearAll").on('click', $.proxy(this.clearAll, this));

		if (typeof trailData !== "undefined") {
			this.restoreTrail();
		}
	},
	setSnap: function(snap) {
		this.routeLayer.setSnap(snap);		
	},
	setupGeocoding: function() {
		this.geocoder = L.mapbox.geocoder('mapbox.places');

		$("#tbxSearch").autocomplete({
			minChars: 3,
			lookup: $.proxy(this.geocoderLookup, this),
			onSelect: $.proxy(this.geocoderSelect, this),
			"deferRequestBy": 150,
			"width": 210
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
		var title = $("#trailName").val();
		data.title = title;
		var url = '/api/saveTrail';
		if (typeof trail_id !== "undefined")
			url += "/" + trail_id;
		$.ajax({
			url: url,
			type: 'post',
			data: JSON.stringify(data),
			contentType : 'application/json'			
		}).success(function(result) {			
			if (result)
				window.location = "/trail/" + result;
		});
	},
	clearAll: function() {
		this.routeLayer.clearAll();
	},
	restoreTrail: function() {
		this.routeLayer.restoreRouteFromJSON(trailData);
		if (trailData.trail.title && trailData.trail.title.length) 
			$("#trailName").val(trailData.trail.title);
	}
};


$(function() {
	mapEngine.init();

	$("#cbxSnap2Roads").prop('checked', true);

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

//http://stackoverflow.com/questions/3954438/remove-item-from-array-by-value
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};