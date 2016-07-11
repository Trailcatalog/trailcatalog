'use strict';

var tcIntersectionsAPI = L.Class.extend({
	intersections: {},
	bounds: null,
	initialize: function(map, options) {
		L.setOptions(this, options);
		this._map = map;

		this.bounds = L.latLngBounds(this._map.getCenter(), this._map.getCenter());
		this.prepareIntersections();

		this._mapmoved = debounce(L.bind(this._mapmoved, this), 1000);

		this._map.on('moveend', this._mapmoved, this);
	},

	getClosestInresection: function(latLng, radius) {
		var result = null;
		var distance = Infinity;

		if (radius) { // calc max distance
			var point = this._map.latLngToLayerPoint(latLng).add(L.point(0, radius));
			var nLatLng = this._map.layerPointToLatLng(point);
			var maxDistance = latLng.distanceTo(nLatLng);		
		}

		for (var n in this.intersections) {
			var d = latLng.distanceTo(this.intersections[n]);
			if (d < distance) {
				result = this.intersections[n];
				distance = d;
			}
		}

		if (radius) {
			if (distance > maxDistance)
				result = null;
		}

		if (result) {
			return {
				latLng: result,
				distance: distance
			};
		}

		return null;
	},

	prepareIntersections: function() {
		var self = this;
		if (this._map.getZoom() >= 15) {

			var bounds = this._map.getBounds();
			if (this.bounds.contains(bounds))
				return;

			console.log('prepareIntersections');
			this.inProcess = true;
			this.bounds.extend(bounds);
			var bbox = "[bbox:" + bounds.getSouth() + "," + bounds.getWest() + "," + bounds.getNorth() + "," + bounds.getEast() + "]";
			var query = '[out:json][timeout:25]' + bbox + ';(way["highway"];);out body;>;out skel qt;';

			$.ajax({
				url: 'https://www.overpass-api.de/api/interpreter',
				dataType: 'json',
				type: 'POST',
				data: {
					data: query
				},
				async: true,
				crossDomain: true
			})
				.success(function(data) {
					var result = self._parseOverpassData(data);
					L.Util.extend(self.intersections, result);
					self.inProcess = false;
					console.log('prepareIntersections done');
				})
				.error(function(data) {
					self.inProcess = false;
				});
		}
	},

	_parseOverpassData: function(data) {
		var ways = [];
		var nodes = {};

		for (var i = 0; i < data.elements.length; i++) {
			var el = data.elements[i];
			if (el.type == "way") {
				ways.push(el);
			} else if (el.type == "node") {
				nodes[el.id] = {
					lat: el.lat,
					lng: el.lon
				};
			}
		}

		var dups = [];

		for (var i = 0; i < ways.length - 1; i++) {
			for (var j = i + 1; j < ways.length; j++) {
				var result = findDupNodes(ways[i], ways[j]);
				dups = dups.concat(result);
			}
		}

		var result = {};

		for (var i = 0; i < dups.length; i++) {
			var node = nodes[dups[i]];
			result[dups[i]] = L.latLng(node.lat, node.lng);
		}

		return result;

		function findDupNodes(arr1, arr2) {
			var result = [];

			for (var i = 0; i < arr1.nodes.length; i++) {
				if (arr2.nodes.indexOf(arr1.nodes[i]) > -1) {
					result.push(arr1.nodes[i]);
				}
			}

			return result;
		}
	},

	_mapmoved: function() {
		if (!self.inProcess)
			this.prepareIntersections();
	}
});

L.tc = L.tc || {};

L.tc.IntersectionsAPI = function(map, options) {
	return new tcIntersectionsAPI(map, options);
}