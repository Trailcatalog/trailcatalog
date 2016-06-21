'use strict';

var tcRouteLayer = L.FeatureGroup.extend({
	options: {
		snap2roads: true,
		intersectionRaduis: 12
	},
	waypoints: [],
	routeSegments: null,
	initialize: function(directionsAPI, intersectionsAPI, options) {
		L.setOptions(this, options);
		L.FeatureGroup.prototype.initialize.call(this, []);

		this.directionsAPI = directionsAPI;
		this.intersectionsAPI = intersectionsAPI;

		this.routeSegments = L.featureGroup().addTo(this);
		this.routeWaypoints = L.featureGroup().addTo(this);

		this.dragMarker = L.marker([0, 0], {
			icon: this._dragIcon(),
			draggable: true,
			riseOnHover: true,
			riseOffset: 1000,
			zIndexOffset: 1000
		})
			.on('dragstart', this._dragStart, this)
			.on('drag', this._drag, this)
			.on('dragend', this._dragEnd, this);
	},

	onAdd: function() {
		L.FeatureGroup.prototype.onAdd.apply(this, arguments);

		this._map
			.on('click', this._click, this)
			.on('mousemove', this._mousemove, this);

	},
	onRemove: function() {
		this._map
			.off('click', this._click, this)
			.off('mousemove', this._mousemove, this);

		L.FeatureGroup.prototype.onRemove.apply(this, arguments);
	},

	// handlers
	_click: function(e) {
		if (this.justDragged)
			return;

		var latLng = e.latlng;

		this._findIntersection(latLng);
	},

	_findIntersection: function(latLng, prevWaypointIndex) {
		var intersection = this.intersectionsAPI.getClosestInresection(latLng, this.options.intersectionRaduis);

		if (!this.options.snap2roads) { // straight
			this._addStraightPoint(latLng, intersection, prevWaypointIndex);
		} else if (intersection) {
			this._addRoutePoint(intersection.latLng, prevWaypointIndex);
		}
	},

	_addWaypoint: function(latLng) {
		var self = this;

		var marker = L.marker(latLng, {
			icon: this._waypointIcon()
		}).addTo(this.routeWaypoints);
		marker.relatedSegments = [];
		this.waypoints.push(marker);

		return marker;
	},

	_addRoutePoint: function(latLng, prevWaypointIndex) {
		if (this.waypoints.length && this.waypoints[this.waypoints.length - 1].getLatLng().equals(latLng))
			return;

		var marker = this._addWaypoint(latLng);

		if (this.waypoints.length > 1) {

			if (typeof prevWaypointIndex !== "undefined")
				var wpStart = this.waypoints[prevWaypointIndex];
			else
				var wpStart = this.waypoints[this.waypoints.length - 2];
			var wpEnd = this.waypoints[this.waypoints.length - 1];
			var segment = L.tc.RouteSegment(wpStart, wpEnd, this.directionsAPI);

			wpStart.relatedSegments.push(segment);
			wpEnd.relatedSegments.push(segment);


			this.routeSegments.addLayer(segment);
			segment.on('removed', this._segmentRemoved, this);
		}
	},

	_addStraightPoint: function(latLng, intersection, prevWaypointIndex) {
		if (!this.waypoints.length) {
			var marker = this._addWaypoint(latLng);
		}

		if (!this.straightSegment) {
			var startWp = this.waypoints[this.waypoints.length - 1];
			if (typeof prevWaypointIndex !== "undefined")
				startWp = this.waypoints[prevWaypointIndex];
			this.straightSegment = L.tc.StraightSegment(startWp).addTo(this.routeSegments);
			this.straightSegment.on('removed', this._segmentRemoved, this);
			this.waypoints[this.waypoints.length - 1].relatedSegments.push(this.straightSegment);
		}

		if (!this.waypoints[this.waypoints.length - 1].getLatLng().equals(latLng)) {
			if (intersection) {
				this.straightSegment.addPoint(intersection.latLng);
				var marker = this._addWaypoint(intersection.latLng);
				this.straightSegment.endDraw(marker);
				marker.relatedSegments.push(this.straightSegment);
				this.straightSegment = null;
			} else {
				this.straightSegment.addPoint(latLng);
			}
		}
	},

	_segmentRemoved: function(e) {
		this.routeSegments.removeLayer(e.target);
		this._checkLonelyWaypoints();
	},

	_checkLonelyWaypoints: function() {
		var waypoints = [];
		for (var i = 0; i < this.waypoints.length; i++) {
			var segments = [];
			for (var j = 0; j < this.waypoints[i].relatedSegments.length; j++) {
				if (this.waypoints[i].relatedSegments[j].options.state == "on")
					segments.push(this.waypoints[i].relatedSegments[j]);
			}

			if (segments.length) {
				this.waypoints[i].relatedSegments = segments;
				waypoints.push(this.waypoints[i]);
			} else {
				this.routeWaypoints.removeLayer(this.waypoints[i]);
			}
		}
		this.waypoints = waypoints;
	},

	/*  */

	_mousemove: function(e) {
		if (this.dragProcess)
			return;
		var closest = this.closestWaypoint(e.layerPoint);
		if (!closest || closest.distance > 6)
			return this.removeLayer(this.dragMarker);

		var latLng = this.waypoints[closest.index].getLatLng();
		if (!this.hasLayer(this.dragMarker))
			this.addLayer(this.dragMarker);
		this.dragMarker.setLatLng(latLng);
		this.currentWaypoint = closest.index;

	},

	_dragStart: function(e) {
		this.dragProcess = true;
	},

	_drag: function(e) {
		var latLng = e.target.getLatLng();
		if (!this.dragPolyline)
			this.dragPolyline = L.polyline([latLng, latLng], this._dragPolylineStyle()).addTo(this);
		else
			this.dragPolyline.spliceLatLngs(1, 1, latLng);
	},

	_dragEnd: function(e) {
		// add
		var latLng = e.target.getLatLng();
		this._findIntersection(latLng, this.currentWaypoint);

		// clear all
		this.dragProcess = false;
		this.currentWaypoint = null;
		this.removeLayer(this.dragPolyline);
		this.dragPolyline = null;
	},

	closestWaypoint: function(point) {
		var min = Infinity;
		var index = null;
		for (var i = 0; i < this.waypoints.length; i++) {
			var p = this._map.latLngToLayerPoint(this.waypoints[i].getLatLng());
			var d = point.distanceTo(p);
			if (d < min) {
				min = d;
				index = i;
			}
		}
		if (index != null) {
			return {
				distance: min,
				index: index
			};
		} else {
			return null;
		}
	},

	_waypointIcon: function() {
		return L.divIcon({
			className: 'marker-map'
		});
	},
	_dragIcon: function() {
		return L.divIcon({
			className: 'marker-map-drag'
		});
	},
	_dragPolylineStyle: function() {
		return {
			'color': '#D30203',
			'weight': 4,
			'opacity': 0.75
		};
	},

	// saving
	getRouteForSave: function() {
		// var segments = this.routeSegments.toGeoJSON();

		var segments = {
			"type": "FeatureCollection",
			"features": []
		};

		var sLayers = this.routeSegments.getLayers();
		for (var i = 0; i < sLayers.length; i++) {
			var segment = sLayers[i].line.toGeoJSON();
			if (sLayers[i] instanceof tcRouteSegment)
				segment.properties["straight"] = false;
			else
				segment.properties["straight"] = true;

			if (sLayers[i].markerStart)
				segment.properties["markerStart"] = L.stamp(sLayers[i].markerStart);
			if (sLayers[i].markerEnd)
				segment.properties["markerEnd"] = L.stamp(sLayers[i].markerEnd);

			segments.features.push(segment);
		}

		var waypoints = this.routeWaypoints.toGeoJSON();
		var wLayers = this.routeWaypoints.getLayers();
		for (var i = 0; i < wLayers.length; i++) {
			waypoints.features[i].properties['stamp'] = L.stamp(wLayers[i]);
		}

		var result = {
			waypoints: waypoints,
			segments: segments
		};

		// console.log(result);
		// console.log(JSON.stringify(result));
		return result;
	},

	restoreRouteFromJSON: function(data) {
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

			var segment = L.tc.restoreSegment(isStraight, markerStart, markerEnd, path, this.directionsAPI);
			this.routeSegments.addLayer(segment);
			segment.on('removed', this._segmentRemoved, this);
			markerStart.relatedSegments.push(segment);
			markerEnd.relatedSegments.push(segment);
		}


		this._map.fitBounds(bounds);
	},
	clearAll: function() {
		this.routeSegments.clearLayers();
		this.routeWaypoints.clearLayers();
		this.waypoints = [];
	}

});

L.tc = L.tc || {};
L.tc.RouteLayer = function(directionsAPI, Intersections, options) {
	return new tcRouteLayer(directionsAPI, Intersections, options);
}