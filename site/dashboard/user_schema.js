const mongoose = require('mongoose');
if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config()
}

const CONNECTION_URL = process.env.CONNECTION_URL;
mongoose.connect(CONNECTION_URL, {useNewUrlParser: true, useUnifiedTopology: true});

const user_schema = new mongoose.Schema({

});

module.exports = mongoose.model("User", user_schema);