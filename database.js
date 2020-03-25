var fs = require('fs');
const MongoClient = require("mongodb").MongoClient;
require('log-timestamp');
var database, collection;

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config()
}

const CONNECTION_URL = process.env.CONNECTION_URL;

module.exports = class Database {

	constructor(DATABASE_NAME) {
		this.DATABASE_NAME = DATABASE_NAME;
	}
	async initialize() {
		let client = await MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true });
		this.database = client.db(this.DATABASE_NAME);
		console.log("Connected to `" + this.DATABASE_NAME + "`!");
	}

	async get_collection(collection_name) {
		let collection = this.database.collection(collection_name);
		let data = await collection.find().toArray();
		return data;
	}

	async get_user(id) {
		let collection = this.database.collection("user");
		let result = await collection.find({ "discord.id": id }).toArray();
		if (result.length == 0) {
			return false;
		}
		else {
			return result[0];
		}
	}

	async find_user(discord_id) {
		var query = { discord_id: discord_id };
		let user = await this.database.collection("user").find(query).toArray();
		return user;
	}

	async add_user(userObj) {
		let collection = this.database.collection('user');
		return await collection.insertOne(userObj);
	}

	async update_user(discord_id, name, value) {
		let queryId = { 'discord.id': discord_id }; //Get the ID of the object
		let myObj = {
			$set: {
				[name]: value //Whatever you want to change for that ID
			}
		};
		await this.database.collection("user").updateOne(queryId, myObj, (err, res) => {
		});
	}

	async remove_user(discord_id) {
		let queryId = { discord_id: discord_id };
		await this.database.collection("user").deleteOne(queryId, (err, res) => {
		});
	}

	async update_settings(domain, name, value) {
		let queryId = { domain: domain }; //Get the ID of the object
		let myObj = {
			$set: {
				[name]: value //Whatever you want to change for that ID
			}
		};
		await this.database.collection("client").updateOne(queryId, myObj, (err, res) => {
		});
	}

	async update_bulk_settings(domain, obj, discord_id) {
		let queryId = { discord_id: discord_id }; //Get the ID of the object
		let myObj = {
			$set: obj
		};
		await this.database.collection("user").updateOne(queryId, myObj, (err, res) => {
		});
	}

	async check_key(key, discord) {
		var query = { key: key };
		let user = await this.database.collection("user").find(query).toArray();
		if (user && user.length == 1) {
			if (user[0].discord_id == "") {
				let date = new Date();
				let myObj = {
					$set: {
						discord_id: discord.id, //Whatever you want to change for that ID
						discord_name: discord.username + '#' + discord.discriminator,
						next_payment: new Date(date.setMonth(date.getMonth() + 1))
					}
				};
				await this.database.collection("user").updateOne(query, myObj, (err, res) => {
				});
				return true;
			}
		}
		return false;
	}
}