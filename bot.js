var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('ssl/key.pem', 'utf8');
var certificate = fs.readFileSync('ssl/cert.pem', 'utf8');
var util = require('util');
var credentials = {key: privateKey, cert: certificate};
var express = require('express');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser')

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("reachedcoding"));
app.use(express.static('site'));
app.use(express.static('site/images/icons'));
app.get('/', function (req, res, next) {
	console.log('Got a res');
	let cookies = req.cookies;
	console.log(cookies);
	next();
}, function (req, res) {
	res.sendFile(path.join(__dirname, 'site/login.html'));
});

app.post('/', function (req, res) {
	console.log('Post a res');
});

// your express configuration here

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);
