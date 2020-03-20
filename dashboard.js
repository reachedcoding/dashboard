// IMPORT LIBRARIES
var fs = require('fs');
var http = require('http');
var https = require('https');
// var privateKey = fs.readFileSync('ssl/key.pem', 'utf8');
// var certificate = fs.readFileSync('ssl/cert.pem', 'utf8');
var util = require('util');
// var credentials = { key: privateKey, cert: certificate };
var express = require('express');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser')
const crypto = require("crypto");
const rp = require('request-promise');
require('log-timestamp');
const Database = require('./database');
const Stripe = require('./stripe');
const Email = require('./email');
const Discord = require('discord.js');

//const Client = require('./client');

// DATABASE INFO
let clients = [], paid_waitlist = [];
let master_db;
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
				name: client.group_name,
				rootUrl: client.domain,
				background_url: client.background_url
			});
		} else {
			res.locals.client = client;
			//runTestCode(client);
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
			name: res.locals.client.group_name,
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url,
			logo: res.locals.client.logo
		});
	}
});

app.use(function (err, req, res, next) {
	console.error(err.stack)
	res.status(500);
	res.render(path.join(__dirname, 'site/dashboard/pages/error.ejs'),
		{
			name: res.locals.client.group_name,
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url,
			logo: res.locals.client.logo,
			brand_color: res.locals.client.brand_color
		});
});

// ROOT DOMAIN QUERY

app.get('/', async function (req, res, next) {
	let discordUser;
	try {
		let discord = res.locals.discord;
		//console.log(discord);
		if (discord) {
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
						let consumers = [];
						for (let user of users) {
							let next_payment = new Date(user.next_payment);
							// console.log(next_payment);
							// console.log(typeof next_payment);
							let days = ((next_payment - new Date()) / (1000 * 3600 * 24)).toFixed(2) + ' days';
							let date = next_payment.toLocaleDateString();
							consumers.push({ "index": index, "discord_id": user.discord_id, "next_payment": date, "days_left": days, "sub_id": user.sub_id, "cust_id": user.cust_id, "discord_name": user.discord_name, "key": user.key });
							index++;
						}
						res.locals.users = consumers;

					}
				} else {
					let db = res.locals.client.db;

					let user = await db.find_user(id);
					if (user.length == 0) {
						res.locals.user = false;
					} else {
						res.locals.user = user[0];
					}
				}
			}
		}
		// ALLOWS PASSING OF THE DISCORD USER_OBJECT BETWEEN METHODS
		next();
	} catch (e) {
		console.log(e);
		res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
			name: res.locals.client.group_name,
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url,
			logo: res.locals.client.logo,
			brand_color: res.locals.client.brand_color
		});
	}

}, async function (req, res) {
	// CHECKS WHETHER DATA HAS BEEN RECEIVED AND SHOWS IT OR SHOWS THE MAIN LOGIN SCREEN
	if (!res.locals.admin) {
		if (req.cookies.a) {
			let discord = res.locals.discord;
			let discord_id = discord.id;
			let discord_name = discord.username + '#' + discord.discriminator;
			let avatar = discord.avatar;
			let discord_image = `https://cdn.discordapp.com/avatars/${discord_id}/${avatar}`;
			if (res.locals.user) {
				let user = res.locals.user;
				let next_payment = new Date(user.next_payment);
				let days = ((next_payment - new Date()) / (1000 * 3600 * 24)).toFixed(2) + ' days';
				let date = next_payment.toLocaleDateString();
				let sub_id = user.sub_id;
				let plan = await res.locals.client.stripe.get_plan(`Amount_${res.locals.client.product.price}`);
				if (!plan) {
					plan = await res.locals.client.stripe.create_plan(res.locals.client.product.price, res.locals.client.product.name);
				}
				let SI = await res.locals.client.stripe.create_sub('https://' + res.locals.client.hostname, `Amount_${res.locals.client.product.price}`);
				let token = SI.id;
				let stripePublicKey = res.locals.client.stripePublicKey;
				// let response = await rp.post('https://discordapp.com/api/oauth2/token', {
				// 	form: {
				// 		client_id: res.locals.client.client_id,
				// 		client_secret: res.locals.client.client_secret,
				// 		grant_type: 'authorization_code',
				// 		redirect_uri: res.locals.client.login_url,
				// 		scope: 'identify email guilds',
				// 		code: code
				// 	},
				// });
				// let info = JSON.parse(response);
				// res.locals.client.add_role(discord_id);
				res.render(path.join(__dirname, 'site/dashboard/pages/user.ejs'),
					{
						name: res.locals.client.group_name,
						rootUrl: res.locals.client.domain,
						background_url: res.locals.client.background_url,
						logo: res.locals.client.logo,
						brand_color: res.locals.client.brand_color,
						discord_name: discord_name,
						discord_image: discord_image,
						type: 'Monthly',
						key: user.key,
						next_payment: sub_id != "" ? 'Your payment is valid until ' + date : 'You do not have a current subscription',
						subscribed: sub_id != "" ? true : false,
						token: token,
						stripePublicKey: stripePublicKey
					});
			} else {
				res.render(path.join(__dirname, 'site/dashboard/pages/key.ejs'),
					{
						name: res.locals.client.group_name,
						rootUrl: res.locals.client.domain,
						background_url: res.locals.client.background_url,
						logo: res.locals.client.logo,
						brand_color: res.locals.client.brand_color,
						discord_name: discord_name,
						discord_image: discord_image
					});
			}
		} else {
			res.render(path.join(__dirname, 'site/dashboard/pages/home.ejs'), {
				name: res.locals.client.group_name,
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url,
				logo: res.locals.client.logo,
				brand_color: res.locals.client.brand_color
			});
		}
	} else {
		res.render(path.join(__dirname, 'site/dashboard/pages/admin.ejs'),
			{
				name: res.locals.client.group_name,
				users: res.locals.users,
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url,
				logo: res.locals.client.logo,
				brand_color: res.locals.client.brand_color
			});
	}
});

async function runTestCode(client) {
	let users = await client.db.get_collection('user');
	let cards = await client.stripe.list_all_cards(users[0].cust_id);
	console.log(cards);
}

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
	let client = res.locals.client;
	if (res.locals.code)
		res.redirect('/')
	else
		res.redirect(`https://discordapp.com/api/oauth2/authorize?response_type=code&client_id=${client.client_id}&scope=identify%20email%20guilds&redirect_uri=${res.locals.client.login_url}&prompt=consent`);
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
		name: res.locals.client.group_name,
		rootUrl: res.locals.client.domain,
		background_url: res.locals.client.background_url,
		logo: res.locals.client.logo,
		brand_color: res.locals.client.brand_color
	});
});

app.get('/checkout', async function (req, res) {
	let client = res.locals.client;
	if (client.product.inventory > 0) {
		//let products = await res.locals.client.stripe.get_all_products();
		let product = client.product;
		let stripePublicKey = res.locals.client.stripePublicKey;
		let SI = await res.locals.client.stripe.create_session('https://' + res.locals.client.hostname,
			product.price,
			product.name,
			product.description,
			product.image);
		let token = SI.id;
		let pi = SI.pi;
		let session = SI.session;
		paid_waitlist.push({
			id: token,
			client: res.locals.client
		});
		res.render(path.join(__dirname, 'site/dashboard/pages/checkout.ejs'), {
			name: res.locals.client.group_name,
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url,
			token: token,
			stripePublicKey: stripePublicKey,
			logo: res.locals.client.logo,
			brand_color: res.locals.client.brand_color

		});
	} else {
		res.render(path.join(__dirname, 'site/dashboard/pages/sold_out.ejs'),
			{
				name: res.locals.client.group_name,
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url,
				logo: res.locals.client.logo,
				brand_color: res.locals.client.brand_color
			});
	}
});

app.get('/paid_subscription', async function (req, res) {
	let client = res.locals.client;
	let session_id = req.query.session_id;
	let session = await client.stripe.get_session(session_id);
	let sub = session.subscription;
	let cust = session.customer;
	let discord = res.locals.discord;
	let users = await client.db.find_user(discord.id);
	let user = users[0];
	let date;
	if (user.next_payment != null)
		date = new Date(user.next_payment);
	else
		date = new Date();
	let obj = {
		sub_id: sub,
		cust_id: cust,
		next_payment: new Date(date.setMonth(date.getMonth() + 1))
	};
	await client.db.update_bulk_settings(client.pure_domain, obj, discord.id);
	res.redirect('/');
});

app.get('/user', function (req, res) {
	res.render(path.join(__dirname, 'site/dashboard/pages/user.ejs'), {
		name: res.locals.client.group_name,
		discord_id: res.locals.discord.id,
		logo: res.locals.client.logo
	});
})

app.get('/success', async function (req, res) {
	let client = res.locals.client;
	let session_id = req.query.session_id;
	if (!session_id) {
		res.render(path.join(__dirname, 'site/dashboard/pages/success.ejs'),
			{
				name: res.locals.client.group_name,
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url,
				logo: res.locals.client.logo,
				brand_color: res.locals.client.brand_color
			});
	} else {
		let session = await client.stripe.get_session(session_id);
		let payment_intent = session.payment_intent;
		let inventory = client.product.inventory;
		if (inventory > 0) {
			client.product.inventory--;
			let response = await client.stripe.capture_payment_intent(payment_intent);
			if (response) {
				res.redirect('/success');
				let key = `${makeid(5)}-${makeid(5)}-${makeid(5)}-${makeid(5)}`;
				let customer = await client.stripe.get_customer(response.customer);
				let toAddress = customer.email;
				client.db.add_user({
					discord_id: '',
					sub_id: '',
					cust_id: '',
					discord_name: '',
					next_payment: '',
					email: toAddress,
					key: key
				});
				let fromAddress = 'info@' + client.pure_domain;
				client.email.sendMail(toAddress, fromAddress, key, client);
			} else {
				client.product.inventory++;
			}
			await client.db.update_settings(client.pure_domain, 'inventory', inventory)
		} else {
			try {
				await cancel_payment_intent(payment_intent);
			} catch (e) {

			}
			res.render(path.join(__dirname, 'site/dashboard/pages/sold_out.ejs'),
				{
					name: res.locals.client.group_name,
					rootUrl: res.locals.client.domain,
					background_url: res.locals.client.background_url,
					logo: res.locals.client.logo,
					brand_color: res.locals.client.brand_color
				});
		}
	}
	//res.redirect('/');
});

app.post('/charge', async function (req, res) {
	const token = req.body.stripeToken;
	const charge = await s.single_charge(token);
});

app.post('/pause-subscription', async function (req, res) {
	console.log('Pause-subscription');
	let discord_id = res.locals.discord.id;
	if (res.locals.admin) {
		let client = res.locals.client;
		let user_db = await client.db.find_user(discord_id);
		if (user_db.length == 1) {
			let sub_id = user_db[0].sub_id;
			await client.stripe.pause_subscription(sub_id);
			res.status(200).send('Ok!');
		} else {
			res.status(403).send('You are not a member of this guild!');
		}
	} else {
		res.status(403).send('Unauthorized!');
	}
});

app.post('/key', async function (req, res) {
	let key = req.body.key;
	let discord = res.locals.discord;
	let client = res.locals.client;
	let user = await client.db.check_key(key, discord);
	if (user) {
		res.status(200).send('Please refresh this page!');
	} else {
		res.status(403).send("Invalid Key");
	}
});

app.post('/remove', async function (req, res) {
	let discord_id = req.body.discord_id;
	let client = res.locals.client;
	if (res.locals.admin) {
		let client = res.locals.client;
		client.db.remove_user(discord_id);
		let response = await client.remove_role(discord_id);
		if (!response)
			res.status(200).send('That user or guild has not been found; The user has been removed from the database!');
		else
			res.status(200).send('Ok!');
	} else {
		res.status(403).send('Unauthorized!');
	}
});

app.get('/settings', async function (req, res) {
	if (res.locals.admin)
		res.render(path.join(__dirname, 'site/dashboard/pages/settings.ejs'),
			{
				name: res.locals.client.group_name,
				rootUrl: res.locals.client.domain,
				background_url: res.locals.client.background_url,
				logo: res.locals.client.logo,
				brand_color: res.locals.client.brand_color,
				inventory: res.locals.client.product.inventory,
				product: res.locals.client.product,
				logo: res.locals.client.logo
			});
	else
		res.status(403).send('Unauthorized!');

});

app.post('/settings', async function (req, res) {
	let discord = res.locals.discord;
	let name = req.body.type;
	let value = req.body.value;
	if (res.locals.admin) {
		let client = res.locals.client;
		res.status(200).send(`The ${name} has been updated to ${value}!`);
		await master_db.update_settings(client.pure_domain, name, value);
		await updateClients();
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
			name: res.locals.client.group_name,
			rootUrl: res.locals.client.domain,
			background_url: res.locals.client.background_url,
			brand_color: res.locals.client.brand_color
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
		}).catch(e => { console.log(e); });
		let discordUser = JSON.parse(response2);
		return discordUser;
	} catch (e) {
		return null;
	}
}

async function onStart() {
	master_db = new Database('Admin_DB');
	await master_db.initialize();
	let clients = await updateClients();
	clients.forEach(client => {
		console.log(`${client.db_name}: ${client.domain}`);
	});
}

async function updateClients() {
	let old_clients = [];
	let clients_db = await master_db.get_collection('client');
	clients_db.forEach(async client => {
		let group_name = client.group_name;
		let domain = client.domain;
		let db_name = client.db_name;
		let stripePublicKey = client.stripePublicKey;
		let stripeSecretKey = client.stripeSecretKey;
		let signing_secret = client.signing_secret;
		let background_url = client.background_url;
		let client_id = client.client_id;
		let client_secret = client.client_secret;
		let bot_token = client.bot_token;
		let role_id = client.role_id;
		let guild_id = client.guild_id;
		let debug = client.debug;
		let sendgrid_key = client.sendgrid_key;
		let logo = client.logo;
		let brand_color = client.brand_color;
		let product = {
			name: client.product_name,
			description: client.product_description,
			price: client.product_price,
			image: client.product_image,
			inventory: client.product_inventory
		};
		let client_obj = new Client(
			group_name,
			domain,
			db_name,
			stripePublicKey,
			stripeSecretKey,
			signing_secret,
			background_url,
			client_id,
			client_secret,
			bot_token,
			role_id,
			guild_id,
			sendgrid_key,
			logo,
			brand_color,
			product,
			debug);
		client_obj.db.initialize();
		old_clients.push(client_obj);
	});
	clients = old_clients;
	return clients;
}

onStart();

// EXPRESS SERVER
var database, collection;

// CREATES SERVER FROM APP LOGIC -- BOTH HTTP AND HTTPS
var httpServer = http.createServer(app);
var httpsServer = https.createServer(app);

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
	constructor(group_name, domain, db_name, stripePublicKey, stripeSecretKey, signing_secret, background_url, client_id, client_secret, bot_token, role_id, guild_id, sendgrid_key, logo, brand_color, product, debug = false) {
		this.group_name = group_name;
		let prefix = debug ? 'debug.' : 'dashboard.';
		this.hostname = prefix + domain;
		this.login_url = encodeURI("https://" + this.hostname + '/login');
		this.pure_domain = domain;
		this.domain = 'https://' + domain;
		this.db = new Database(db_name);
		this.db_name = db_name;
		this.stripePublicKey = stripePublicKey;
		this.stripeSecretKey = stripeSecretKey;
		this.signing_secret = signing_secret;
		this.background_url = background_url;
		this.role_id = role_id;
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.bot_token = bot_token;
		this.guild_id = guild_id;
		this.client = new Discord.Client();
		try {
			this.client.login(bot_token);
		} catch (e) {
			console.log("The discord token for " + group_name + " is invalid... Please input this value in the admin dashboard.");
		}
		this.logo = logo;
		this.brand_color = brand_color;
		this.product = product;
		this.stripe = new Stripe(stripePublicKey, stripeSecretKey);
		this.email = new Email(sendgrid_key);
		//this.email.sendMail('ssinghnes@gmail.com', 'noreply@reachedcoding.com', 'FSDFS-SDFSD-SDFSD-SGSER');
	}

	async add_role(discord_id) {
		try {
			let guild = client.guilds.get(this.guild_id);
			let member = await this.client.fetchUser(discord_id);
			let user = await guild.fetchMember(member);
			if (user) {
				let role = await guild.roles.find(r => r.id === this.role_id);
				let success = await user.addRole(role);
				if (success) {
					return true;
				}
			}
			return false;
		} catch (e) {
			return false;
		}
	}

	async remove_role(discord_id) {
		try {
			let guild = client.guilds.get(this.guild_id);
			let member = await this.client.fetchUser(discord_id);
			let user = await guild.fetchMember(member);
			if (user) {
				let role = await guild.roles.find(r => r.id === this.role_id);
				let success = await user.removeRole(role);
				if (success) {
					return true;
				}
			}
			return false;
		} catch (e) {
			return false;
		}
	}

	async initialize() {
		await this.db.initialize();
	}
}