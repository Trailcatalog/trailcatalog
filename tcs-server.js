'use strict';

var appPort = 3000;

var express = require('express');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');


var app = express();
app.use(bodyParser.json());


app.engine('handlebars', exphbs({
	defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

require('./router.js').addRoutes(app);

app.listen(appPort, function() {
	console.log('Example app listening on port ' + appPort);
});