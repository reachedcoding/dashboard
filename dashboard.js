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
//const Client = require('./client');

// DATABASE INFO
let clients = [], paid_waitlist = [];

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

// WEBSITE ACCESSIBILITY AND FLOW
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("reachedcoding"));
app.use(express.static('site'));
app.use(express.static('site/dashboard'));
app.use(express.static('site/dashboard/'));
app.use(express.static('site/images/icons'));
app.set('view engine', 'ejs');


// MIDDLEWARE ON ROOT DOMAIN -- NOTHING FOR NOW
app.use('/', async function (req, res, next) {
	try {
		let client = clients.find(client => client.hostname == req.hostname);
		if (!client) {
			let client = clients.find(client => client.db_name == "ReachedIO");
			res.status(403).render(path.join(__dirname, 'site/dashboard/pages/not_paid.ejs'), {
				rootUrl: client.domain,
				background_url: client.background_url
			});
		} else {
		res.locals.client = client;
		if (req.path != '/login' && req.cookies.a && req.cookies.r) {
			res.locals.discord = await getDiscord(req);
			res.locals.id = res.locals.discord.id;
			res.locals.user = await client.db.get_user(res.locals.id);
			if (res.locals.user.type == 'admin') {
				res.locals.admin = true;
			} else {
				res.locals.admin = false;
			}
			if (req.method === 'GET' || req.method === 'HEAD') {

				next();
			} else {
				let code = req.query.code;
				next();
				//if (req.path != '/login' && req.path != '/home') throw 'home';
			}
		} else next();
	}
	} catch (e) {
		//console.log(e);
		res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url
		});
	}
});

app.use(function (err, req, res, next) {
	console.error(err.stack)
	res.status(500);
	res.render(path.join(__dirname, 'site/dashboard/pages/error.ejs'),
		{
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url
		});
});

// ROOT DOMAIN QUERY

app.get('/', async function (req, res, next) {
	let discordUser;
	try {
		let discord = res.locals.discord;
		let id = discord.id;
		if (id) {
			if (res.locals.admin) {
				let db = res.locals.client.db;
				// FIND AN ID IN THE DATABASE WITH THE SAME ID AND RETURN ALL DATABASE DATA FOR THAT KEY
				// IF NOT FOUND, ADD TO THE DATABASE AND REFRESH
				let users = await db.get_collection('user');
				if (!users) {
					res.redirect('/error');
				} else {
					let index = 1;
					let users = [];
					for (let user of users) {
						let days = ((user.next_payment - new Date()) / (1000 * 3600 * 24)).toFixed(2) + ' days';
						let date = user.next_payment.toLocaleDateString();
						users.push({ "index": index, "discord_id": user.discord_id, "next_payment": date, "days_left": days, "sub_id": user.sub_id, "cust_id": user.cust_id, "discord_name": user.discord_name });
						index++;
					}
					res.locals.users = users;

				}
			} else {
				
			}
		}
		// ALLOWS PASSING OF THE DISCORD USER_OBJECT BETWEEN METHODS
		next();
	} catch (e) {
		console.log(e);
		res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url
		});
	}

}, function (req, res) {
	// CHECKS WHETHER DATA HAS BEEN RECEIVED AND SHOWS IT OR SHOWS THE MAIN LOGIN SCREEN
	if (!res.locals.admin) {
		if (req.cookies.a) {
			res.render(path.join(__dirname, 'site/dashboard/pages/user.ejs'),
				{
					rootUrl: res.locals.client.domain,
					background_url: res.locals.client.background_url
				});
		} else {
			res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url
			});
		}
	} else {
		res.render(path.join(__dirname, 'site/dashboard/pages/index.ejs'),
			{
				users: res.locals.users,
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url
			});
	}
});

// LOGIN DOMAIN QUERY
app.get('/login', async function (req, res, next) {
	// GET CODE FROM URL_ENCODED_VALUES - SHOULD BE A CALLBACK FROM DISCORD'S OAUTH2 FLOW
	let code = req.query.code;
	let client = res.locals.client;
	if (code) {
		try {
			res.locals.code = true;

			// AQUIRE ACCESS TOKEN AND REFRESH TOKEN FROM DISCORD'S API
			let response = await rp.post('https://discordapp.com/api/oauth2/token', {
				form: {
					client_id: client.client_id,
					client_secret: client.client_secret,
					grant_type: 'authorization_code',
					redirect_uri: client.login_url,
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
		res.redirect(`https://discordapp.com/api/oauth2/authorize?response_type=code&client_id=608328061699620865&scope=identify%20email%20guilds&redirect_uri=${res.locals.client.login_url}&prompt=consent`);
});

// LOGOUT DOMAIN QUERY -- DELETES ACCESS AND REFRESH COOKIES THEN REDIRECTS TO ROOT DOMAIN
app.get('/logout', async function (req, res) {
	res.clearCookie("a");
	res.clearCookie("r");
	res.redirect('/');
});

// NOT REALLY IMPLEMENTED YET BUT MAY SERVE AS A HOMEPAGE
app.get('/home', function (req, res) {
	res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
		rootUrl: res.locals.client.domain,
		background_url: res.locals.client.background_url
	});
});

app.get('/checkout', async function (req, res) {
	let stripePublicKey = res.locals.client.stripePublicKey;
	let token = await res.locals.client.stripe.create_session('membership', 'https://' + res.locals.client.hostname);
	paid_waitlist.push({
		id: token,
		client: res.locals.client,
		discord: res.locals.discord
	});
	res.render(path.join(__dirname, 'site/dashboard/pages/checkout.ejs'), {
		rootUrl: res.locals.client.domain,
		background_url: res.locals.client.background_url,
		token: token,
		stripePublicKey: stripePublicKey
	});
});

app.get('/success', async function (req, res) {
	let session_id = req.query.session_id;

	res.redirect('/');
});

app.post('/charge', async function (req, res) {
	const token = req.body.stripeToken;
	const charge = await s.single_charge(token);
});

app.post('/remove', async function (req, res) {
	let discord_id = req.body.discord_id;
	if (res.locals.admin) {
		let client = res.locals.client;
		client.db.remove_user(discord_id);
		res.status(200).send('Ok!');
	} else {
		res.status(403).send('Unauthorized!');
	}
});

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
	const sig = req.headers['stripe-signature'];

	let event;
	let client = res.locals.client;
	try {
		event = client.stripe.stripe.webhooks.constructEvent(req.body, sig, client.signing_secret);
	} catch (err) {
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Handle the checkout.session.completed event
	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;

		// Fulfill the purchase...
		handleCheckoutSession(session);
	}

	// Return a response to acknowledge receipt of the event
	res.json({ received: true });
});


app.get('*', function (req, res) {
	res.status(404);
	res.render(path.join(__dirname, 'site/dashboard/pages/error.ejs'),
		{
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url
		});
});

async function handleCheckoutSession(session) {
	let sub = session.subscription;
	let cust = session.customer;
	let id = session.id;
	let payer_obj = paid_waitlist.find(obj => obj.id == id);
	let client = payer_obj.client;
	let user_db = await client.db.find_user(payer_obj.discord.id);
	let next_payment = await client.stripe.get_next_date(sub);
	let date = new Date(next_payment * 1000);
	let key = `${makeid(5)}-${makeid(5)}-${makeid(5)}-${makeid(5)}`;
	if (user_db.length == 0) {
		client.db.add_user({
			discord_id: payer_obj.discord.id,
			sub_id: sub,
			cust_id: cust,
			discord_name: payer_obj.discord.username + '#' + payer_obj.discord.discriminator,
			next_payment: date,
			key: key
		});
	} else {
		client.db.update_user(payer_obj.discord.id, date);
	}
}

function makeid(length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

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
async function getDiscord(req) {
	try {
		let a = req.cookies.a;
		let access_token = decrypt(a);
		let response2 = await rp.get('https://discordapp.com/api/users/@me', {
			headers: {
				authorization: `Bearer ${access_token}`,
			}
		}).catch(e => { });
		discordUser = JSON.parse(response2);
		return discordUser;
	} catch {
		return null;
	}
}

async function onStart() {
	let db = new Database('Admin_DB');
	await db.initialize();
	let clients_db = await db.get_collection('client');
	clients_db.forEach(client => {
		let domain = client.domain;
		let db_name = client.db_name;
		let stripePublicKey = client.stripePublicKey;
		let stripeSecretKey = client.stripeSecretKey;
		let signing_secret = client.signing_secret;
		let background_url = client.background_url;
		let client_id = client.client_id;
		let client_secret = client.client_secret;
		let debug = client.debug;
		let client_obj = new Client(domain, db_name, stripePublicKey, stripeSecretKey, signing_secret, background_url, client_id, client_secret, debug);
		client_obj.db.initialize();
		clients.push(client_obj);
	});
	clients.forEach(client => {
		console.log(`${client.db_name}: ${client.domain}`);
	});
}

onStart();

// EXPRESS SERVER
var database, collection;

// CREATES SERVER FROM APP LOGIC -- BOTH HTTP AND HTTPS
var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

// LISTEN ON HTTP AND HTTPS PORTS AND SERVE
httpsServer.listen(443, () => {
	//db = new Database('ReachedIO');
});
httpServer.listen(80);

// HELPFUL FUNCTION IF EVER NEED TO SLEEP
async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

class Client {
	constructor(domain, db_name, stripePublicKey, stripeSecretKey, signing_secret, background_url, client_id, client_secret, debug = false) {
		let prefix = debug ? 'debug.' : 'dashboard.';
		this.hostname = prefix + domain;
		this.login_url = encodeURI("https://" + this.hostname + '/login');
		this.domain = 'https://' + domain;
		this.db = new Database(db_name);
		this.db_name = db_name;
		this.stripePublicKey = stripePublicKey;
		this.stripeSecretKey = stripeSecretKey;
		this.signing_secret = signing_secret;
		this.background_url = background_url;
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.stripe = new Stripe(stripePublicKey, stripeSecretKey);
	}

	async initialize() {
		await this.db.initialize();
	}
}