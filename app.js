/* 
* @Author: Eslam El-Meniawy
* @Date: 2015-09-16 15:27:09
* @Last Modified by: eslam
* @Last Modified time: 2015-09-30 10:06:23
*
* Dear maintainer:
* When I wrote this, only God and I understood what I was doing
* Now, God only knows
* So, good luck maintaining the code :D
*/

var http = require("http"),
	fs = require("fs"),
	express = require("express")
	bodyParser = require('body-parser'),
	mysql = require('mysql'),
	gcm = require('node-gcm');
var configuration = JSON.parse(fs.readFileSync("configuration.json"));
var app = express();
var server = http.createServer(app);
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
app.use(bodyParser.urlencoded({ extended: false }));
var connection = mysql.createConnection({
	host: configuration.dbHost,
	user: configuration.dbUser,
	password: configuration.dbUserPassword,
	database: configuration.dbName
});
connection.connect(function(err) {
	if (err) {
		console.error('Database error connecting: ' + err.stack);
		return;
	}
	console.log('Database connected as id ' + connection.threadId);
});
connection.query('CREATE TABLE IF NOT EXISTS notifications_ids(id int PRIMARY KEY AUTO_INCREMENT, device_id varchar(250) UNIQUE, registeration_id varchar(300))', function(err, result) {
	if (err) {
		console.log(err);
	}
});
app.post("/register", function(request, response) {
	connection.query('SELECT 1 FROM notifications_ids WHERE device_id=' + connection.escape(request.body.devId), function(err, results) {
		if (err) {
			console.log(err);
			response.end('Error saving ID :(');
		} else {
			if (results.length > 0) {
				var sql = 'UPDATE notifications_ids SET registeration_id=' + connection.escape(request.body.regId) + ' WHERE device_id=' + connection.escape(request.body.devId);
				connection.query(sql, function(err, result) {
					if (err) {
						console.log(err);
						response.end('Error saving ID :(');
					} else {
						response.end('Updated :)');
					}
				});
			} else {
				var sql = 'INSERT IGNORE INTO notifications_ids (device_id, registeration_id) VALUES (' + connection.escape(request.body.devId) + ', ' + connection.escape(request.body.regId) + ')';
				connection.query(sql, function(err, result) {
					if (err) {
						console.log(err);
						response.end('Error saving ID :(');
					} else {
						response.end('Added :)');
					}
				});
			}
		}
	});
});
app.post("/notify", function(request, response) {
	var message = new gcm.Message();
	message.addData('message', request.body.title);
	message.addData('additionalData', {'id': request.body.id});
	message.timeToLive = 1800;
	var sender = new gcm.Sender('AIzaSyCcIxatp3y7G7RAnn2su7NuOg7vmjmHQz8');
	connection.query('SELECT registeration_id from notifications_ids', function(err, results) {
		if (err) {
			console.log(err);
			response.end('Error notifying users :(');
		} else {
			if (results.length > 0) {
				if (results.length > 1000) {
					var loopTimes = Math.ceil(results.length / 1000);
					for (var i = 0; i < loopTimes; i++) {
						if (i == (loopTimes - 1)) {
							var regIds = [];
							for (var j = (i * 1000); j < results.length; j++) {
								regIds.push(results[j].registeration_id);
							}
							sender.send(message, { registrationIds: regIds }, 4, function (err, result) {
								if(err) {
									response.end('Error notifying users :(');
								} else {
									response.end('Done notifying users :)');
								}
							});
						} else {
							var regIds = [];
							for (var j = (i * 1000); j < ((i * 1000) + 1000); j++) {
								regIds.push(results[j].registeration_id);
							}
							sender.send(message, { registrationIds: regIds }, 4, function (err, result) {});
						}
					}
				} else {
					var regIds = [];
					for (var i = 0; i < results.length; i++) {
						regIds.push(results[i].registeration_id);
					}
					sender.send(message, { registrationIds: regIds }, 4, function (err, result) {
						if(err) {
							response.end('Error notifying users :(');
						} else {
							response.end('Done notifying users :)');
						}
					});
				}
			} else {
				response.end('No users to notify :(');
			}
		}
	});
});
app.get("*", function(request, response) {
	response.status(404).send("Not found :(");
});
app.listen(configuration.port, configuration.host, function() {
	console.log("Listening on: " + configuration.host + ":" + configuration.port);
});