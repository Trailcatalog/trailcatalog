'use strict';

var appPort = 3000;

var express = require('express');
var app = express();
var exphbs = require('express-handlebars');


app.engine('handlebars', exphbs({
	defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

require('./router.js').addRoutes(app);

app.listen(appPort, function() {
	console.log('Example app listening on port ' + appPort);
});