'use strict';

var express = require('express');
var Pool = require('pg').Pool;
var wkx = require('wkx');
var async = require('async');
var request = require('request');

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
	ro.get('/edittrail/:id', editTrail);

	ro.post('/api/saveTrail', saveTrail);
	ro.post('/api/saveTrail/:id', updateTrail);
	ro.get('/api/deletetrail/:id', deleteTrail);
	ro.get('/api/ele/', getGoogleElevation);

	app.use('/', ro);
}


function getGoogleElevation(req, res) {
	var url = 'https://maps.googleapis.com/maps/api/elevation/json?key=AIzaSyDHkbJ-Dv_CehE0tmwvCM7V4mSY8rhYqZs&';

	var params = [];
	for (var n in req.query) {
		params.push(encodeURIComponent(n) + "=" + encodeURIComponent(req.query[n]));
	}

	url += params.join("&");

	request(url, function(err, response, body) {
		if (err) {
			res.send(err);
		} else {
			res.send(body);
		}
	});
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
			if (!trailData.trail) {
				res.redirect('/');
			} else {
				res.render('staticTrail', {
					title: trailData.trail.title,
					id: trailData.trail.id,
					elevation: trailData.trail.elevation,
					length: trailData.trail.length,
					trailData: "var trailData = " + JSON.stringify(trailData)
				});
			}
		});
	} else {
		res.redirect('/');
	}
}

function editTrail(req, res) {
	var id = +req.params.id;

	if (id) {
		getTrail(id, function(err, trailData) {
			if (!trailData.trail) {
				res.redirect('/');
			} else {
				res.render('trail', {
					title: trailData.trail.title,
					id: trailData.trail.id,
					trailData: "var trail_id = " + trailData.trail.id + ";var trailData = " + JSON.stringify(trailData)
				});
			}
		});
	} else {
		res.redirect('/');
	}
}

function deleteTrail(req, res) {
	var id = +req.params.id;

	pool.connect(function(err, client, done) {
		if (err) {
			return console.error('error fetching client from pool', err);
		}

		client.query('DELETE FROM trails WHERE id = $1', [id], function(err, result) {
			done();
			if (err)
				res.send(err);
			else
				res.redirect('/');
		});
	});
}

function prepareTrailData(data) {
	var queryTrails = "INSERT INTO trails(title, length, elevation) VALUES($1, $2, $3) RETURNING id";
	var queryTrailsParams = [data.title, data.distance, data.elevation];

	var queryWaypoints = "INSERT INTO waypoints(trail_id, stamp, point, is_intersection) VALUES($1, $2, $3, $4)";
	var querySegments = 'INSERT INTO segments(trail_id, is_straight, "markerStart", "markerEnd", line, inner_points) VALUES($1, $2, $3, $4, $5, $6)';

	var queryWaypointsParams = [];
	var querySegmentsParams = [];

	var waypoints = data.waypoints.features;
	for (var i = 0; i < waypoints.length; i++) {
		var stamp = waypoints[i].properties.stamp;
		var isIntersection = waypoints[i].properties.isIntersection;
		var geom = 'SRID=4326;' + wkx.Geometry.parseGeoJSON(waypoints[i].geometry).toWkt();
		queryWaypointsParams.push([null, stamp, geom, isIntersection]);
	}

	var segments = data.segments.features;
	for (var i = 0; i < segments.length; i++) {
		var is_straight = segments[i].properties.straight;
		var markerStart = segments[i].properties.markerStart;
		var markerEnd = segments[i].properties.markerEnd;
		var innerPoints = segments[i].properties.innerPoints;
		var geom = 'SRID=4326;' + wkx.Geometry.parseGeoJSON(segments[i].geometry).toWkt();
		querySegmentsParams.push([null, is_straight, markerStart, markerEnd, geom, innerPoints]);
	}

	return {
		queryTrails: queryTrails,
		queryTrailsParams: queryTrailsParams,
		queryWaypoints: queryWaypoints,
		querySegments: querySegments,
		queryWaypointsParams: queryWaypointsParams,
		querySegmentsParams: querySegmentsParams
	}
}

function saveTrail(req, res) {
	var data = prepareTrailData(req.body);


	pool.connect(function(err, client, done) {
		if (err) {
			return console.error('error fetching client from pool', err);
		}

		client.query(data.queryTrails, data.queryTrailsParams, function(err, result) {
			if (err) {
				res.send("error");
				return done();
			}

			var trail_id = result.rows[0].id;

			async.parallel([
				// waypoints
				function(callback) {
					async.each(data.queryWaypointsParams, function(item, callback) {
						item[0] = trail_id;
						client.query(data.queryWaypoints, item, function(err, result) {
							callback(err);
						});
					}, callback);
				},
				// segments
				function(callback) {
					async.each(data.querySegmentsParams, function(item, callback) {
						item[0] = trail_id;
						client.query(data.querySegments, item, function(err, result) {
							callback(err);
						});
					}, callback);
				}
			], function(err) {
				if (err) {
					res.send("error " + err);
				} else {
					res.send(trail_id.toString());
				}
				done();
			});
		});
	});
}

function updateTrail(req, res) {
	var trail_id = +req.params.id;
	var data = prepareTrailData(req.body);

	data.queryTrails = "UPDATE trails SET title = $2, length = $3, elevation = $4   WHERE id = $1";
	data.queryTrailsParams.splice(0, 0, trail_id);

	pool.connect(function(err, client, done) {
		if (err) {
			return console.error('error fetching client from pool', err);
		}

		client.query(data.queryTrails, data.queryTrailsParams, function(err, result) {
			if (err) {
				res.send("error");
				return done();
			}

			async.series([

				function(callback) {
					client.query("DELETE FROM waypoints WHERE trail_id = $1", [trail_id], function(err, result) {
						callback(err);
					});
				},
				function(callback) {
					client.query("DELETE FROM segments WHERE trail_id = $1", [trail_id], function(err, result) {
						callback(err);
					});
				}
			], function() {
				async.parallel([
					// waypoints
					function(callback) {
						async.each(data.queryWaypointsParams, function(item, callback) {
							item[0] = trail_id;
							client.query(data.queryWaypoints, item, function(err, result) {
								callback(err);
							});
						}, callback);
					},
					// segments
					function(callback) {
						async.each(data.querySegmentsParams, function(item, callback) {
							item[0] = trail_id;
							client.query(data.querySegments, item, function(err, result) {
								callback(err);
							});
						}, callback);
					}
				], function(err) {
					if (err)
						res.send("error " + err);
					else
						res.send(trail_id.toString());
					done();
				});
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
				//waypoints
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
									"stamp": result.rows[i].stamp,
									"isIntersection": result.rows[i].is_intersection
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
									"innerPoints": result.rows[i].inner_points
								},
								"geometry": geom.toGeoJSON()
							};
							geoJSON.features.push(feature);
						}

						callback(null, geoJSON);
					});
				}
			],
			function(err, results) {
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