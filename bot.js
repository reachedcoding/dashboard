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
const crypto = require("crypto");
const { google } = require('googleapis');
const readline = require('readline');

let spreadsheet_ID;

fs.readFile('settings.json', (err, content) => {
	if (err) return console.log('Error loading settings:', err);
	var settings = JSON.parse(content);
	spreadsheet_ID = settings.spreadsheet_ID;
});

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("reachedcoding"));
app.use(express.static('site'));
app.use(express.static('site/images/icons'));
app.get('/', function (req, res, next) {
	console.log('Got a res');
	let cookie = req.cookies.id;
	if (cookie === undefined) {
	// no: set a new cookie
	let randomNumber = crypto.randomBytes(20).toString('hex');
    res.cookie('id',randomNumber, { maxAge: 900000, httpOnly: true });
    console.log('cookie created successfully');
	} else {
		console.log('cookie exists', cookie);
	}
	next();
}, function (req, res) {
	res.sendFile(path.join(__dirname, 'site/login.html'));
});

app.post('/', function (req, res) {
	console.log('Post a res');
});

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
function getValues(auth, email, paid, author = null) {
  const sheets = google.sheets({ version: 'v4', auth });
  let range = 'Sheet1';
  let spreadsheetId = spreadsheet_ID;
  sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  }, (err, result) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      if (paid === true) {
        email_paid(email, result.data.values);
      } else {
        addDiscordToData(email, result.data.values, author);
      }
    }
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