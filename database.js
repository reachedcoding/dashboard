var fs = require('fs');
const MongoClient = require("mongodb").MongoClient;
require('log-timestamp');
var database, collection;

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config()
}

const CONNECTION_URL = process.env.CONNECTION_URL;
const DATABASE_NAME = process.env.DATABASE_NAME;

module.exports = class Database {

	constructor() {
		MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
			if (error) {
				throw error;
			}
			this.database = client.db(DATABASE_NAME);
			console.log("Connected to `" + DATABASE_NAME + "`!");
		});
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
				return result[0];
			}
		} else {
			return result[0]
		}
	}

	async add_user(id, userObj, user_type) {
		let collection = this.database.collection(user_type);
		collection.insert(userObj, (error, result) => {
			if (error) {
				return response.status(500).send(error);
			}
			else{


			}
		});
	}

	
}