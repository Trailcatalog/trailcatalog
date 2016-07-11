'use strict';

var tcStaticRouteLayer = L.FeatureGroup.extend({
	waypoints: [],
	initialize: function(options) {
		L.setOptions(this, options);
		L.FeatureGroup.prototype.initialize.call(this, []);

		this.routeSegments = L.featureGroup().addTo(this);
		this.routeWaypoints = L.featureGroup().addTo(this);
	},

	_addWaypoint: function(latLng) {
		var self = this;

		var marker = L.marker(latLng, {
			icon: this._waypointIcon()
		}).addTo(this.routeWaypoints);
		this.waypoints.push(marker);

		if (this.waypoints.length == 1)
			this.showStartMarker();

		return marker;
	},

	onAdd: function() {
		L.FeatureGroup.prototype.onAdd.apply(this, arguments);
	},

	restoreRouteFromJSON: function(data, map) {
		var self = this;
		var waypoints = data.waypoints;
		var segments = data.segments;

		var bounds = null;

		var twLayer = L.geoJson(waypoints);
		var wLayers = twLayer.getLayers();

		var wpHash = {};

		for (var i = 0; i < wLayers.length; i++) {
			var coords = wLayers[i].getLatLng();

			if (!bounds)
				bounds = L.latLngBounds(coords, coords);
			else
				bounds.extend(coords);

			var wp = this._addWaypoint(coords);
			var stamp = waypoints.features[i].properties['stamp'];
			wpHash[stamp] = wp;
		}

		var tsLayer = L.geoJson(segments);
		var sLayers = tsLayer.getLayers();

		for (var i = 0; i < sLayers.length; i++) {
			var isStraight = segments.features[i].properties.straight;
			var markerStart = wpHash[segments.features[i].properties.markerStart];
			var markerEnd = wpHash[segments.features[i].properties.markerEnd];
			var path = sLayers[i].getLatLngs();

			var segment = L.tc.restoreSegment(isStraight, markerStart, markerEnd, path, this.directionsAPI, this.surfaceAPI, {labelCssClass: 'label-read-only'});
			this.routeSegments.addLayer(segment);
		}

		map.fitBounds(bounds);		
	},
	showStartMarker: function() {
		if (this.startLabel) {
			this.removeLayer(this.startLabel);
			this.startLabel = null;
		}

		if (!this.waypoints.length)
			return;

		var marker = this.waypoints[0];
		this.startLabel = new L.tc.Label({
			offset: [0, -16],
			cssClass: 'marker-start'
		});
		this.startLabel.setContent("START");
		this.startLabel.setLatLng(marker.getLatLng());
		this.addLayer(this.startLabel)
	},

	_waypointIcon: function() {
		return L.divIcon({
			className: 'marker-map'
		});
	}
});


L.tc = L.tc || {};
L.tc.StaticRouteLayer = function(options) {
	return new tcStaticRouteLayer(options);
}