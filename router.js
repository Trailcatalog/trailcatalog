'use strict';

var express = require('express');
var Pool = require('pg').Pool;
var wkx = require('wkx');
var async = require('async');

var dbConfig = {
	user: 'postgres', //env var: PGUSER
	database: 'trailcatalog', //env var: PGDATABASE
	password: '123', //env var: PGPASSWORD
	port: 5432 //env var: PGPORT
};

var pool = new Pool(dbConfig);


module.exports.addRoutes = function(app) {

	var ro = express.Router();

	ro.get('/', home);
	ro.get('/newtrail', newTrail);
	ro.get('/trail/:id', staticTrail);

	ro.post('/api/saveTrail', saveTrail);

	app.use('/', ro);
}


function home(req, res) {
	getTrailList(function(err, rows) {
		if (!err) {
			if (!rows.length)
				return res.redirect('/newtrail');
		}

		res.render('home', {
			rows: rows
		});
	});
}

function newTrail(req, res) {
	res.render('trail');
}

function staticTrail(req, res) {
	var id = +req.params.id;

	if (id) {
		getTrail(id, function(err, trailData) {
			// res.send(trailData);
			res.render('staticTrail', {
				title: trailData.trail.title,
				id: trailData.trail.id,
				trailData: "var trailData = " + JSON.stringify({
					waypoints: trailData.waypoints,
					segments: trailData.segments
				})
			});
		});
	} else {
		res.redirect('/');
	}
}

function saveTrail(req, res) {
	var data = req.body;

	var queryTrails = "INSERT INTO trails(title) VALUES($1) RETURNING id";
	var queryTrailsParams = [data.title];

	var queryWaypoints = "INSERT INTO waypoints(trail_id, stamp, point) VALUES($1, $2, $3)";
	var querySegments = 'INSERT INTO segments(trail_id, is_straight, "markerStart", "markerEnd", line) VALUES($1, $2, $3, $4, $5)';

	var queryWaypointsParams = [];
	var querySegmentsParams = [];

	var waypoints = data.waypoints.features;
	for (var i = 0; i < waypoints.length; i++) {
		var stamp = waypoints[i].properties.stamp;
		var geom = 'SRID=4326;' + wkx.Geometry.parseGeoJSON(waypoints[i].geometry).toWkt();
		queryWaypointsParams.push([null, stamp, geom]);
	}

	var segments = data.segments.features;
	for (var i = 0; i < segments.length; i++) {
		var is_straight = segments[i].properties.straight;
		var markerStart = segments[i].properties.markerStart;
		var markerEnd = segments[i].properties.markerEnd;
		var geom = 'SRID=4326;' + wkx.Geometry.parseGeoJSON(segments[i].geometry).toWkt();
		querySegmentsParams.push([null, is_straight, markerStart, markerEnd, geom]);
	}

	pool.connect(function(err, client, done) {
		if (err) {
			return console.error('error fetching client from pool', err);
		}

		client.query(queryTrails, queryTrailsParams, function(err, result) {
			if (err) {
				res.send("error");
				return done();
			}

			var trail_id = result.rows[0].id;

			async.parallel([
				// waypoints
				function(callback) {
					async.each(queryWaypointsParams, function(item, callback) {
						item[0] = trail_id;
						client.query(queryWaypoints, item, function(err, result) {
							callback(err);
						});
					}, callback);
				},
				// segments
				function(callback) {
					async.each(querySegmentsParams, function(item, callback) {
						item[0] = trail_id;
						client.query(querySegments, item, function(err, result) {
							callback(err);
						});
					}, callback);
				}
			], function(err) {
				if (err)
					res.send("error " + err);
				else
					res.send("ok " + trail_id);
				done();
			});
		});
	});
}

function getTrailList(callback) {
	pool.connect(function(err, client, done) {
		if (err)
			return callback(err);

		client.query('SELECT * FROM trails ORDER BY id DESC', function(err, result) {
			if (err) {
				done();
				return callback(err);
			}

			done();
			callback(null, result.rows);
		});
	});
}


function getTrail(id, callback) {
	pool.connect(function(err, client, done) {
		if (err)
			return callback(err);

		async.parallel([
			// trails
			function(callback) {
				client.query('SELECT * FROM trails WHERE id = $1', [id], function(err, result) {
					if (err)
						return callback(err);

					if (result.rows.length)
						callback(null, result.rows[0]);
					else
						callback(null);
				});
			},
			// waypoints
			function(callback) {
				client.query('SELECT *, ST_AsText(point) as geom FROM waypoints WHERE trail_id = $1', [id], function(err, result) {
					if (err)
						return callback(err);

					var geoJSON = {
						"type": "FeatureCollection",
						"features": []
					};

					for (var i = 0; i < result.rows.length; i++) {
						var geom = wkx.Geometry.parse(result.rows[i].geom);
						var feature = {
							"type": "Feature",
							"properties": {
								"stamp": result.rows[i].stamp
							},
							"geometry": geom.toGeoJSON()
						};
						geoJSON.features.push(feature);
					}

					callback(null, geoJSON);
				});
			},
			// segments
			function(callback) {
				client.query('SELECT *, ST_AsText(line) as geom  FROM segments WHERE trail_id = $1', [id], function(err, result) {
					if (err)
						return callback(err);

					var geoJSON = {
						"type": "FeatureCollection",
						"features": []
					};

					for (var i = 0; i < result.rows.length; i++) {
						var geom = wkx.Geometry.parse(result.rows[i].geom);
						var feature = {
							"type": "Feature",
							"properties": {
								"straight": result.rows[i].is_straight,
								"markerStart": result.rows[i].markerStart,
								"markerEnd": result.rows[i].markerEnd,
							},
							"geometry": geom.toGeoJSON()
						};
						geoJSON.features.push(feature);
					}

					callback(null, geoJSON);
				});
			}
		], function(err, results) {
			done();
			var result = {
				trail: results[0],
				waypoints: results[1],
				segments: results[2]
			};
			callback(err, result);
		});
	});
}