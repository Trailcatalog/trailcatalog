'use strict';

var express = require('express');

module.exports.addRoutes = function(app) {

	var ro = express.Router();

	ro.get('/', home);
	ro.get('/newtrail', newtrail);


	app.use('/', ro);
}


function home(req, res) {
	res.render('home');	
}

function newtrail(req, res) {
	res.render('trail');	
}