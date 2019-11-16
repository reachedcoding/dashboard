// IMPORT LIBRARIES
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
const rp = require('request-promise');
const MongoClient = require("mongodb").MongoClient;
require('log-timestamp');

// DATABASE INFO
let db, client_id, client_secret;
const CONNECTION_URL = 'mongodb+srv://SERVER_ACCESS:4141@reachedio-server-dlyzm.mongodb.net/test?retryWrites=true&w=majority';
const DATABASE_NAME = "ReachedIO";

// TEMPLATE FOR ADMIN USER OBJECT
let adminObj = {
	id: "",
	next_payment: "",
	stripe_token: "",
	first_login: ""
};

// TEMPLATE FOR REGULAR USER OBJECT
let userObj = {
	id: "",
	next_payment: "",
	stripe_token: "",
	first_login: ""
};

// LOAD CONFIGURATION
fs.readFile('settings.json', (err, content) => {
	if (err) return console.log('Error loading settings:', err);
	var settings = JSON.parse(content);
	spreadsheet_ID = settings.spreadsheet_ID;
	client_id = settings.client_id;
	client_secret = settings.client_secret;
});

// WEBSITE ACCESSIBILITY AND FLOW
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("reachedcoding"));
app.use(express.static('site'));
app.use(express.static('site/dashboard'));
app.use(express.static('site/dashboard/'));
app.use(express.static('site/images/icons'));
app.set('view engine', 'ejs');

// OAUTH2 FLOW LOGIN CALLBACK
const login_url = encodeURI("https://dashboard.reachedcoding.com/login");

// MIDDLEWARE ON ROOT DOMAIN -- NOTHING FOR NOW
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

// ROOT DOMAIN QUERY

app.get('/', async function (req, res, next) {
	let discordUser;
	try {
		// GET COOKIES FROM REQUEST
		let a = req.cookies.a; 
		// DECRYPT THE ACCESS TOKEN COOKIE -- IF DOES NOT EXIST OR WRONGLY ENCODED, THROWS ERROR AND GOES TO THE CATCH BLOCK
		let access_token = decrypt(a);
		// REQUEST DISCORD_USER OBJECT FROM DISCORD'S API USING THE ACCESS TOKEN -- MAY ALSO THROW ERROR
		let response2 = await rp.get('https://discordapp.com/api/users/@me', {
			headers: {
				authorization: `Bearer ${access_token}`,
			}
		}).catch(e => { });
		discordUser = JSON.parse(response2);
		console.log(`${discordUser.username}#${discordUser.discriminator} logged in!`);
		// ALLOWS PASSING OF THE DISCORD USER_OBJECT BETWEEN METHODS
		let values = [];
		for (var key in discordUser) {
			if (discordUser.hasOwnProperty(key)) {
				values.push({ "key": key, "value": discordUser[key] })
			}
		}
		// ALLOWS PASSING OF THE DISCORD USER_OBJECT BETWEEN METHODS
		res.locals.ejs = values;
		res.locals.site = discordUser;
		next();
	} catch (e) {
		res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'));
	}

}, function (req, res) {
	// CHECKS WHETHER DATA HAS BEEN RECEIVED AND SHOWS IT OR SHOWS THE MAIN LOGIN SCREEN
	if (!res.locals.ejs) {
		res.send(res.locals.site);
	} else {
		res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'),
			{
				values: res.locals.ejs
			});
	}
});

// LOGIN DOMAIN QUERY
app.get('/login', async function (req, res, next) {
	// GET CODE FROM URL_ENCODED_VALUES - SHOULD BE A CALLBACK FROM DISCORD'S OAUTH2 FLOW
	let code = req.query.code;
	if (code) {
		try {
			res.locals.code = true;

			// AQUIRE ACCESS TOKEN AND REFRESH TOKEN FROM DISCORD'S API
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

			// ENCRYPT ACCESS AND REFRESH TOKENS
			var a = encrypt(info.access_token);
			var r = encrypt(info.refresh_token);

			// SET COOKIE'S TO THE ENCRYPTED ACCESS AND REFRESH TOKENS
			res.cookie('a', a, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true });
			res.cookie('r', r, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true });
			let id = discordUser.id;
			
			// SPECIAL RESPONSE FROM DISCORD'S API SAYING NOT AUTHORIZED
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
	// IF RECEIVED CODE AS SUCCESSFULLY PARSED THEN PASS TO ROOT DOMAIN DIRECTORY ELSE TRY AUTHENTICATING AGIAN
	if (res.locals.code)
		res.redirect('/')
	else
		res.redirect(`https://discordapp.com/api/oauth2/authorize?response_type=code&client_id=608328061699620865&scope=identify%20email%20guilds&redirect_uri=${login_url}&prompt=consent`);
});

// LOGOUT DOMAIN QUERY -- DELETES ACCESS AND REFRESH COOKIES THEN REDIRECTS TO ROOT DOMAIN
app.get('/logout', async function (req, res, next) {
	res.clearCookie("a");
	res.clearCookie("r");
	next();
}, function (req, res) {
	res.redirect('/');
});

// NOT REALLY IMPLEMENTED YET BUT MAY SERVE AS A HOMEPAGE
app.get('/home', function (req, res) {
	res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'));
});

// TEST DOMAIN QUERY -- USED TO TEST MONGODB DATABASE FUNCTIONALITY AND INTEGRATION
app.get('/test', async function (req, res) {
	try {
		// GET DISCORD ID FROM COOKIES AND DISCORD API REQUEST
		let id = await getDiscordId(req);
		if (id)
			// FIND AN ID IN THE DATABASE WITH THE SAME ID AND RETURN ALL DATABASE DATA FOR THAT KEY
			// IF NOT FOUND, ADD TO THE DATABASE AND REFRESH
			collection.find({ "id": id }).toArray((error, result) => {
				if (error) {
					return res.status(500).send(error);
				}
				// IF ID NOT FOUND
				if (result.length == 0) {
					userObj.id = id;
					userObj.first_login = new Date();
					collection.insert(userObj, (error, result) => {
						if (error) {
							return response.status(500).send(error);
						}
					});
					res.redirect('/test');
				} else {
					let values = [];
					for (var key in result[0]) {
						if (result[0].hasOwnProperty(key)) {
							values.push({ "key": key, "value": result[0][key] })
						}
					}
					res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'),
						{
							values: values
						});
				}
			});
		else
			res.redirect('/');
	} catch {
		res.redirect('/');
	}
});

// ENCRYTION/DECRYPTION LOGIC

var algorithm = 'aes192',
	password = 'd6F3Efeq';

function encrypt(text) {
	var cipher = crypto.createCipheriv(algorithm, password, null)
	var crypted = cipher.update(text, 'utf8', 'hex')
	crypted += cipher.final('hex');
	return crypted;
}

function decrypt(text) {
	var decipher = crypto.createDecipheriv(algorithm, password, null)
	var dec = decipher.update(text, 'hex', 'utf8')
	dec += decipher.final('utf8');
	return dec;
}

// FROM REQUEST RETURNS THE ID OF THE USER WITH THAT ACCESS TOKEN
async function getDiscordId(req) {
	try {
		let a = req.cookies.a;
		let access_token = decrypt(a);
		let response2 = await rp.get('https://discordapp.com/api/users/@me', {
			headers: {
				authorization: `Bearer ${access_token}`,
			}
		}).catch(e => { });
		discordUser = JSON.parse(response2);
		return discordUser.id;
	} catch {
		return null;
	}
}

// EXPRESS SERVER
var database, collection;

// CREATES SERVER FROM APP LOGIC -- BOTH HTTP AND HTTPS
var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

// LISTEN ON HTTP AND HTTPS PORTS AND SERVE
httpServer.listen(80, () => {
	// MONGODB INTEGRATION - ESTABLISHES CONNECTION WITH THE DATABASE
	MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
		if (error) {
			throw error;
		}
		database = client.db(DATABASE_NAME);
		collection = database.collection("admin");
		//console.log("Connected to `" + DATABASE_NAME + "`!");
	});
});
httpsServer.listen(443);

// HELPFUL FUNCTION IF EVER NEED TO SLEEP
async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}