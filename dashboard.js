var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey = fs.readFileSync('ssl/key.pem', 'utf8');
var certificate = fs.readFileSync('ssl/cert.pem', 'utf8');
var util = require('util');
var credentials = { key: privateKey, cert: certificate };
var express = require('express');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser')
const crypto = require("crypto");
const { google } = require('googleapis');
const readline = require('readline');
const request = require('request');
const fetch = require('node-fetch');
const FormData = require('form-data');
const rp = require('request-promise');
let spreadsheet_ID, db, users, client_id, client_secret;

fs.readFile('settings.json', (err, content) => {
	if (err) return console.log('Error loading settings:', err);
	var settings = JSON.parse(content);
	spreadsheet_ID = settings.spreadsheet_ID;
	client_id = settings.client_id;
	client_secret = settings.client_secret;
});

fs.readFile('db.json', (err, content) => {
	if (err) return console.log('Error loading settings:', err);
	db = JSON.parse(content);
	users = db.users;
});

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("reachedcoding"));
app.use(express.static('site'));
app.use(express.static('site/dashboard'));
app.use(express.static('site/dashboard/'));
app.use(express.static('site/images/icons'));
app.set('view engine', 'ejs');

const login_url = encodeURI("https://dashboard.reachedcoding.com/login");
app.use('/', function (req, res, next) {
	if (req.method === 'GET' || req.method === 'HEAD') {
		if (req.cookies.a && req.cookies.r) {
			next();
		} else {
			let code = req.query.code;
			if (code)
				next();
			else
				next();
			}
	} else
		next();
});

app.get('/', async function (req, res, next) {
	let discordUser;
	try {
		let a = req.cookies.a;
		let access_token = decrypt(a);
		let response2 = await rp.get('https://discordapp.com/api/users/@me', {
			headers: {
				authorization: `Bearer ${access_token}`,
			}
		}).catch(e => { });
		discordUser = JSON.parse(response2);
		res.locals.site = discordUser;
		let values = [];
		for (var key in discordUser) {
			if (discordUser.hasOwnProperty(key)) {
				values.push({"key": key, "value": discordUser[key]})
			}
		}
		res.locals.ejs = values;
		res.locals.site = discordUser;
		next();
	} catch (e) {
		res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'));
	}

}, function (req, res) {
	if (!res.locals.ejs) {
		res.send(res.locals.site);
	} else {
		res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'),
	{
		values: res.locals.ejs
	});
	}
});

app.get('/login', async function (req, res, next) {
	let code = req.query.code;
	if (code) {
		try {
			res.locals.code = true;
			let response = await rp.post('https://discordapp.com/api/oauth2/token', {
				form: {
					client_id: client_id,
					client_secret: client_secret,
					grant_type: 'authorization_code',
					redirect_uri: login_url,
					scope: 'identify email guilds',
					code: code
				},
			});
			let info = JSON.parse(response);
			var a = encrypt(info.access_token);
			var r = encrypt(info.refresh_token);
			res.cookie('a', a, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true });
			res.cookie('r', r, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true });
			let id = discordUser.id;
			let values = await getValues();
			let found;
			for (i in values) {
				if (values[i][0] == id) {
					found = i;
				}
			}
			values.push([id]);
			if (!found) {
				setValues(auth, values, found + 1);
			}
			if (discordUser.code && discordUser.code == 0) {
				res.locals.site = "Unauthorized";
			} else {
				res.locals.site = discordUser;
			}
		} catch (e) {
			res.locals.site = "An Error has Occured";
		}
	} else {
		res.locals.code = false;
	}
	next();
}, function (req, res) {
	if (res.locals.code)
		res.redirect('/')
	else
		res.redirect(`https://discordapp.com/api/oauth2/authorize?response_type=code&client_id=608328061699620865&scope=identify%20email%20guilds&redirect_uri=${login_url}&prompt=consent`);
	// if (res.locals.site) {
	// 	res.send(res.locals.site);
	// } else {
	// 	res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'));
	// }
});

app.get('/logout', async function (req, res, next) {
	res.clearCookie("a");
	res.clearCookie("r");
	next();
}, function (req,res) {
	res.redirect('/');
});

app.get('/home', function (req,res) {
	res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'));
});
// app.get('/', function (req, res, next) {
// 	let cookie;
// 	console.log('Got');
// 	cookie, res = checkCookies(req, res);
// 	next();
// }, function (req, res) {
// 	res.sendFile(path.join(__dirname, 'site/login.html'));
// });

// app.get('/register', function (req, res, next) {
// 	let firstName = req.query.firstName;
// 	let lastName = req.query.lastName;
// 	let email = req.query.email;
// 	let pass = req.query.pass;
// 	if (firstName, lastName, email, pass) {
// 		let user = new User(firstName, lastName, email, pass, crypto.randomBytes(20).toString('hex'), null, null);
// 		users.push(user);
// 		res.locals.user = user;
// 	} else {
// 		res.locals.user = false;
// 	}
// }, function (req, res) {
// 	let user = res.locals.user;
// 	if (!user) {
// 		res.sendFile(path.join(__dirname, 'site/register.html'));
// 	} else {
// 		//res.redirect('/')
// 	}
// });

// app.post('/', function (req, res) {
// 	console.log('Post a res');
// });

// EXPRESS HELPER FUNCTIONS

var algorithm = 'aes-256-ctr',
	password = 'd6F3Efeq';

function encrypt(text) {
	var cipher = crypto.createCipher(algorithm, password)
	var crypted = cipher.update(text, 'utf8', 'hex')
	crypted += cipher.final('hex');
	return crypted;
}

function decrypt(text) {
	var decipher = crypto.createDecipher(algorithm, password)
	var dec = decipher.update(text, 'hex', 'utf8')
	dec += decipher.final('utf8');
	return dec;
}

function checkCookies(req, res) {
	let cookie = req.cookies.id;
	if (cookie === undefined) {
		// no: set a new cookie
		let randomNumber = crypto.randomBytes(20).toString('hex');
		res.cookie('id', randomNumber, { maxAge: 1000 * 60 * 60 * 24 * 30, httpOnly: true });
		console.log('cookie created successfully', randomNumber);
		return false, res;
	} else {
		console.log('cookie exists', cookie);
		return cookie, res;
	}
}

function checkCredentials(res) {
	let username = res.locals.username;
	let password = res.locals.password;
	return username, password;
}

function authenticate() {
	let spreadsheet = getValues();
	for (var i = 1; i < spreadsheet.length; i++) {
		if (username.toLowerCase() == spreadsheet[i][0].toLowerCase()) {
			if (password == spreadsheet[i][1]) {
				return i, spreadsheet;
			}
		}
	}
	return false;
}

function saveDatabase() {
	db.users = users;
	fs.writeFile('db.json', JSON.stringify(db, null, 2), function (err) {
		if (err) return console.log(err);
	});
}

// EXPRESS SERVER

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

// GOOGLE SHEETS INTEGRATION

var oAuth2Client;
let auth;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);
	// Authorize a client with credentials, then call the Google Sheets API.
	authorize(JSON.parse(content), getValues);
});
function authorize(credentials, callback) {
	const { client_secret, client_id, redirect_uris } = credentials.installed;
	oAuth2Client = new google.auth.OAuth2(
		client_id, client_secret, redirect_uris[0]);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getNewToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		auth = oAuth2Client;
	});
}

function getNewToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('Error while trying to retrieve access token', err);
			oAuth2Client.setCredentials(token);
			// Store the token to disk for later program executions
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) console.error(err);
				console.log('Token stored to', TOKEN_PATH);
			});
			callback(oAuth2Client);
		});
	});
}
function getValues() {
	const sheets = google.sheets({ version: 'v4', auth });
	let range = 'Sheet1';
	let spreadsheetId = spreadsheet_ID;
	return new Promise(function (resolve, reject) {
		sheets.spreadsheets.values.get({
			spreadsheetId,
			range,
		}, (err, result) => {
			if (err) {
				// Handle error
				console.log(err);
				reject(err);
			} else {
				console.log(result.data.values)
				resolve(result.data.values);
			}
		});
	});
}
function setValues(auth, values, index) {
	const sheets = google.sheets({ version: 'v4', auth });
	const resource = {
		values,
	};
	let range;
	if (index) {
		range = 'Sheet1!' + index + ':' + index;
	} else {
		range = 'Sheet1!A1:ZZ';
	}
	let spreadsheetId = spreadsheet_ID;
	var valueInputOption = 'RAW';
	sheets.spreadsheets.values.update({
		spreadsheetId,
		range,
		valueInputOption,
		resource,
	}, (err, result) => {
		if (err) {
			// Handle error
			console.log(err);
		} else {
			//console.log('%d cells updated.', result.updatedCells);
		}
	});
}

class User {
	constructor(first_name, last_name, email, password, id, cookies, bots = null) {
		this.first_name = first_name;
		this.last_name = last_name;
		this.email = email;
		this.password = password;
		this.id = id;
		this.cookies = cookies;
		this.bots = bots;
	}
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}