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
require('log-timestamp');
const Database = require('./database');
const Stripe = require('./stripe');

let s = new Stripe();
(async function() {
console.log(await s.create_customer());
})();

// DATABASE INFO
let db, client_id, client_secret;
let rootUrl = "https://www.reachedcoding.com/";

// TEMPLATE FOR ADMIN USER OBJECT
let adminObj = {
	id: "",
	type: ""
};

// TEMPLATE FOR REGULAR USER OBJECT
let userObj = {
	discord_id: "",
	next_payment: "",
	sub_id: "",
	cust_id: "",
	type: ""
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
		let value = { "index": "1","discord_id": "None", "next_payment": "None", "sub_id": "Sub_id", "cust_id": "cust_id", "discord_name": "discord_name" };
		res.locals.value = value
		// ALLOWS PASSING OF THE DISCORD USER_OBJECT BETWEEN METHODS
		res.locals.ejs = true;
		res.locals.site = discordUser;
		next();
	} catch (e) {
		res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
			rootUrl: rootUrl
		});
	}    

}, function (req, res) {
	// CHECKS WHETHER DATA HAS BEEN RECEIVED AND SHOWS IT OR SHOWS THE MAIN LOGIN SCREEN
	if (!res.locals.ejs) {
		res.send(res.locals.site);
	} else {
		res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'),
			{
				value: res.locals.value
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
	res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
		rootUrl: rootUrl
	});
});

// TEST DOMAIN QUERY
app.get('/test', async function (req, res) {
	try {
		// GET DISCORD ID FROM COOKIES AND DISCORD API REQUEST
		let id = await getDiscordId(req);
		if (id) {
			// FIND AN ID IN THE DATABASE WITH THE SAME ID AND RETURN ALL DATABASE DATA FOR THAT KEY
			// IF NOT FOUND, ADD TO THE DATABASE AND REFRESH
			let user = await db.get_user(id);
			if (!user) {
				res.redirect('/test');
			} else {
				let index = 1;
				let value = { "index": index,"discord_id": user.discord_id, "next_payment": user.next_payment, "sub_id": user.sub_id, "cust_id": user.cust_id, "discord_name": user.discord_name };
				res.send(value);
				//res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'),
				//	{
				//		value: value
				//	});
			}
		}
		else
			res.redirect('/');
	} catch (e) {
		res.redirect('/');
	}
});

app.get('/admin', async function (req, res) {
	res.render(path.join(__dirname, 'site/dashboard/pages/admin_home.ejs'), {
		rootUrl: rootUrl
	});
});

app.post('/cancel', async function (req,res) {

});

// ENCRYTION/DECRYPTION LOGIC

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
httpsServer.listen(443, () => {
	db = new Database();
});
httpServer.listen(80);

// HELPFUL FUNCTION IF EVER NEED TO SLEEP
async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
