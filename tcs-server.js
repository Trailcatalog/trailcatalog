'use strict';

var appPort = 3000;

var express = require('express');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var crypto = require('crypto');


var app = express();
app.use(bodyParser.json());


app.engine('handlebars', exphbs({
	defaultLayout: 'main',
	helpers: {
		numberCommas: function(str) {
			return str.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		},
		roundTo4: function(str) {
			if (str)
				return parseFloat(+str.toFixed(4));
		},
		md5: function(str) {
			return crypto.createHash('md5').update(str.toString()).digest('hex');
		}
	}
}));
app.set('view engine', 'handlebars');

require('./router.js').addRoutes(app);

app.listen(appPort, function() {
	console.log('Example app listening on port ' + appPort);
});