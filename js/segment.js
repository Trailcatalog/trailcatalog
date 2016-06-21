'use strict';

var tcSegment = L.FeatureGroup.extend({

	includes: L.Mixin.Events,

	options: {
		routeStyle: {
			'color': '#FF8000',
			'weight': 4,
			'opacity': 0.75
		},
		highlightStyle: {
			'color': '#A70005',
			'weight': 4,
			'opacity': 0.75
		},
		labelCssClass: '',
		state: 'on'
	},
	elevation: 0,
	initialize: function(markerStart, markerEnd, directionsAPI, surfaceAPI, options, path) {
		L.setOptions(this, options);
		L.FeatureGroup.prototype.initialize.call(this, [], options);

		this.markerStart = markerStart;
		this.markerEnd = markerEnd;
		this.directionsAPI = directionsAPI;
		this.surfaceAPI = surfaceAPI;
		this.path = path;

		this._draw();
	},
	_draw: function() {
		var self = this;
		this.clearLayers();
		this.line = null;
		this.label = null;

		if (!this.path) {
			var waypoints = [this.markerStart.getLatLng(), this.markerEnd.getLatLng()];
			this.line = L.polyline(waypoints, this.options.routeStyle).addTo(this);
		} else {
			this.line = L.polyline(this.path, this.options.routeStyle).addTo(this);
		}
		this._calcDistance();
		this._calcElevation();

	},
	_calcDistance: function() {
		var latLngs = this.line.getLatLngs();
		var distance = 0;
		for (var j = 0; j < latLngs.length - 1; j++) {
			distance += latLngs[j].distanceTo(latLngs[j + 1]);
		}

		var center = this._getSegmentCenter(latLngs, distance);
		if (this.label) {
			this.label.off('remove', this._removeSegment, this);
			this.label = null;
		}

		this.label = new L.tc.Label({
			offset: [0, 0],
			segmentIndex: 0,
			cssClass: this.options.labelCssClass
		});

		var distanceInMiles = Math.round(distance / 10 * 0.621371) / 100; // convert meters to miles
		this.distance = distanceInMiles;
		this.label.setContent(distanceInMiles + " Mi");
		this.label.setLatLng(center);
		this.addLayer(this.label);

		this.label.on('remove', this._removeSegment, this);
	},

	_calcElevation: function() {
		var self = this;
		var latLngs = this.line.getLatLngs();

		var isStraight = this instanceof tcStraightSegment;
		var elevations = this.surfaceAPI.getElevations(latLngs, isStraight, function(err, data) {
			if (!err && data && data.length) {
				var cummulative = 0;
				var prev = data[0];
				for (var i = 1; i < data.length; i++) {
					var diff = data[i] - prev;
					if (diff > 0)
						cummulative += diff;
					prev = data[i];
				}

				self.elevation = cummulative * 3,28084; // feets
			}			
		});
	},

	_getSegmentCenter: function(segment, length) {
		var distance = 0;
		for (var i = 0; i <= segment.length - 1; i++) {
			distance += segment[i].distanceTo(segment[i + 1]);
			if (distance > length / 2) {
				var bounds = L.latLngBounds(segment[i], segment[i + 1]);
				return bounds.getCenter();
			}
		}
	},

	_removeSegment: function(e) {
		var self = this;
		this.line.setStyle(this.options.highlightStyle);
		setTimeout(function() {
			self.clearLayers();
			self.options.state = 'off';
			self.fire('removed');
		}, 500);
	},

	getDistance: function() {
		return this.distance;
	},

	getElevation: function() {
		return this.elevation;
	}
});

var tcRouteSegment = tcSegment.extend({
	_draw: function() {
		var self = this;
		this.clearLayers();
		this.line = null;
		this.label = null;

		if (!this.path) {
			var waypoints = [this.markerStart.getLatLng(), this.markerEnd.getLatLng()];
			this.directionsAPI.getRoute(waypoints, function(err, data) {
				if (!err && data.length) {
					data[0] = waypoints[0];
					data[data.length - 1] = waypoints[1];

					self.line = L.polyline(data, self.options.routeStyle).addTo(self);
					self._calcDistance();
					self._calcElevation();
				}
			});
		} else {
			self.line = L.polyline(this.path, self.options.routeStyle).addTo(self);
			self._calcDistance();
			self._calcElevation();
		}
	}
});

var tcStraightSegment = tcSegment.extend({
	options: {
		routeStyle: {
			'color': '#0674D7',
			'weight': 4,
			'opacity': 0.75
		},
		endMarkerIcon: L.divIcon({
			className: 'marker-map-unsnapped'
		}),
		labelCssClass: 'straightLable',
	},
	tempEndMarker: null,

	addPoint: function(latLng) {
		this.line.addLatLng(latLng);
		this._setTempEndMarker();
	},
	endDraw: function(marker) {
		this.markerEnd = marker;
		this._clearTempEndMarker();
		this._calcDistance();
		this._calcElevation();
	},
	_draw: function() {
		if (!this.path) {
			this.line = L.polyline([this.markerStart.getLatLng()], this.options.routeStyle).addTo(this);
		} else {
			this.line = L.polyline(this.path, this.options.routeStyle).addTo(this);
			this._calcDistance();
			this._calcElevation();
		}
	},
	_setTempEndMarker: function() {
		this._clearTempEndMarker();
		var points = this.line.getLatLngs();
		if (points.length) {
			this.tempEndMarker = L.marker(points[points.length - 1], {
				icon: this.options.endMarkerIcon
			}).addTo(this);
		}
	},
	_clearTempEndMarker: function() {
		if (this.tempEndMarker) {
			this.removeLayer(this.tempEndMarker);
			this.tempEndMarker = null;
		}
	}
});

L.tc = L.tc || {};
L.tc.Segment = function(markerStart, markerEnd, directionsAPI, surfaceAPI, options, path) {
	return new tcSegment(markerStart, markerEnd, directionsAPI, options, path);
}

L.tc.RouteSegment = function(markerStart, markerEnd, directionsAPI, surfaceAPI, options) {
	return new tcRouteSegment(markerStart, markerEnd, directionsAPI, surfaceAPI, options);
}

L.tc.StraightSegment = function(markerStart, surfaceAPI, options) {
	return new tcStraightSegment(markerStart, null, null, surfaceAPI, options);
}
L.tc.restoreSegment = function(isStraight, markerStart, markerEnd, path, directionsAPI, surfaceAPI) {
	var segment;

	if (isStraight) {
		segment = new tcStraightSegment(markerStart, markerEnd, directionsAPI, surfaceAPI, {}, path);
	} else {
		segment = new tcRouteSegment(markerStart, markerEnd, directionsAPI, surfaceAPI, {}, path);
	}

	return segment;
}