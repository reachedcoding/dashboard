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
		let collection = this.database.collection("admin");
		let result = await collection.find({ "discord_id": id }).toArray();
		if (result.length == 0) {
			collection = this.database.collection("users");
			result = await collection.find({ "discord_id": id }).toArray();
			if (result.length == 0) {
				return false;
			}
			else {
				result[0].type = 'user';
				return result[0];
			}
		} else {
			result[0].type = 'admin';
			return result[0]
		}
	}

	async find_user(discord_id) {
		var query = { discord_id: discord_id };
		let user = await this.database.collection("user").find(query).toArray();
		return user;
	}

	async add_user(userObj) {
		let collection = this.database.collection('user');
		await collection.insertOne(userObj, (error, result) => {
			if (error) {
				return response.status(500).send(error);
			}
			else {


			}
		});
	}

	async update_user(discord_id, next_payment) {
		let queryId = { discord_id: discord_id }; //Get the ID of the object
		let myObj = { 
			$set: { 
				next_payment: next_payment //Whatever you want to change for that ID
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
}