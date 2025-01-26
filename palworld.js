import { spawn } from 'child_process';
import { DiscordRequest } from './utils.js';

const emptyServerInterval = 1000 * 15; // 15 seconds
const emptyServerThreshold = 1000 * 60 * 15; // 15 minutes
const shutdownDelay = 1000 * 40; // 40 seconds
const safeShutdownDelay = 1000 * 3; // 3 seconds

let serverOnline = false;

export function isServerOnline() {
	return serverOnline;
}

export async function getPublicIP() {
	let retString;
	await fetch('https://api.ipify.org?format=json')
		.then(response => response.json())
		.then(data => {
			retString = `The server's IP is: ${data.ip}:8211`;
		})
		.catch(err => {
			retString = `Error: ${err}`;
		});
	return retString;
}

export async function getServerStatus() {
	const url = process.env.REST_URL + 'info';

	let options = {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			Authorization:
				`Basic ` +
				new Buffer.from(
					process.env.REST_USERNAME + ':' + process.env.REST_PASSWORD
				).toString('base64')
		}
	};

	let message;
	await fetch(url, options)
		.then(response => response.json())
		.then(data => {
			let name = data.servername;
			let version = data.version;
			message = `Palworld Server "${name}" is online and running version ${version}`;
			serverOnline = true;
		})
		.catch(err => {
			message = 'Server is currently offline';
			serverOnline = false;
		});
	return message;
}

export async function getPlayerList() {
	const url = process.env.REST_URL + 'players';

	let options = {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			Authorization:
				`Basic ` +
				new Buffer.from(
					process.env.REST_USERNAME + ':' + process.env.REST_PASSWORD
				).toString('base64')
		}
	};

	let message;
	await fetch(url, options)
		.then(response => response.json())
		.then(data => {
			let players = data.players;
			// console.log(players.length);
			if (players.length === 0) {
				message = 'No players are currently online';
			} else {
				let playerList = '';
				players.forEach(player => {
					playerList += `\t\t**${player.name}**\n`;
				});
				message = `Online Players:\n${playerList}`;
			}
			serverOnline = true;
		})
		.catch(err => {
			message = 'Server is currently offline';
			serverOnline = false;
		});
	return message;
}

export async function startServer(token) {
	// Check to see if the server is already running.
	const status = await getServerStatus();
	if (status.includes('online')) {
		serverOnline = true;
		return 'Server is already running!';
	}
	confirmSafeServerStart(token);
	return 'Checking to see if the server is up to date...';
}

async function confirmSafeServerStart(token) {
	// console.log(token);
	const bat = spawn('bash', ['StartPalServer.sh', token]);
	bat.stdout.on('data', data => {
		console.log(data.toString());
	});
	serverOnline = true;
	monitorEmptyServer();
}

export async function commandShutdown(token) {
	// Check to see if the server is already running.
	const players = await getPlayerList();
	if (players.includes('offline')) {
		serverOnline = false;
		return 'Server is already offline!';
	} else if (players.includes('Online Players')) {
		serverOnline = true;
		return 'Players are still online!';
	} else {
		// stopServerAfterDelay(shutdownDelay, token);
		// return 'Shutting down the server in 40 seconds...';
		saveThenSafeShutdown(safeShutdownDelay, token);
		return 'Saving the world and shutting down the server...';
	}
}

async function shutdownServer() {
	let message;

	const url = process.env.REST_URL + 'stop';
	let options = {
		method: 'POST',
		headers: {
			Authorization:
				`Basic ` +
				new Buffer.from(
					process.env.REST_USERNAME + ':' + process.env.REST_PASSWORD
				).toString('base64')
		}
	};

	await fetch(url, options)
		.then(response => {
			message = 'Server has been shut down';
			serverOnline = false;
		})
		.catch(err => {
			console.log(err);
			message = 'Error shutting down server';
			serverOnline = true;
		});

	return message;
}

async function saveThenSafeShutdown(delay, token) {
	try {
		await silentSave();
	} catch (err) {
		console.error(err);
	}

	try {
		let waitTime = Math.floor(delay / 1000);
		await safeShutdown(waitTime);
	} catch (err) {
		console.error(err);
	}

	await new Promise(resolve => setTimeout(resolve, delay));

	const endpoint = `webhooks/${process.env.APP_ID}/${token}/messages/@original`;
	try {
		await DiscordRequest(endpoint, {
			method: 'PATCH',
			body: {
				content: message
			}
		});
	} catch (err) {
		console.error(err);
	}
}

async function silentSave() {
	const url = process.env.REST_URL + 'save';
	let options = {
		method: 'POST',
		headers: {
			Authorization:
				`Basic ` +
				new Buffer.from(
					process.env.REST_USERNAME + ':' + process.env.REST_PASSWORD
				).toString('base64')
		}
	};

	await fetch(url, options)
		.then(response => {
			console.log('Server has been saved');
		})
		.catch(err => {
			console.log(err);
		});
}

export async function safeShutdown(delay) {
	let message;

	let warning = 'Server is shutting down in ' + delay + ' seconds!';

	let data = JSON.stringify({
		waittime: delay,
		message: warning
	});

	const url = process.env.REST_URL + 'shutdown';
	let options = {
		method: 'POST',
		headers: {
			Authorization:
				`Basic ` +
				new Buffer.from(
					process.env.REST_USERNAME + ':' + process.env.REST_PASSWORD
				).toString('base64'),
			'Content-Type': 'application/json'
		},
		body: data
	};

	await fetch(url, options)
		.then(response => {
			if (response.status === 200) {
				message = 'Server has been shut down';
				serverOnline = false;
			} else {
				message = 'Error shutting down server';
				serverOnline = true;
			}
		})
		.catch(err => {
			console.log(err);
			message = 'Error shutting down server';
			serverOnline = true;
		});

	return message;
}

async function stopServerAfterDelay(delay, token) {
	await new Promise(resolve => setTimeout(resolve, delay));
	const message = await shutdownServer();

	const endpoint = `webhooks/${process.env.APP_ID}/${token}/messages/@original`;
	try {
		await DiscordRequest(endpoint, {
			method: 'PATCH',
			body: {
				content: message
			}
		});
	} catch (err) {
		console.error(err);
	}
}

export async function monitorEmptyServer() {
	await new Promise(resolve => setTimeout(resolve, emptyServerInterval));

	let lastTimePlayersSeen = Date.now();
	while (serverOnline) {
		console.log('Checking for empty server...');
		const players = await getPlayerList();
		if (players.includes('Online Players')) {
			console.log('Players are online, resetting timer...');
			lastTimePlayersSeen = Date.now();
		} else {
			console.log('No players online...');
		}

		const currentTime = Date.now();
		if (currentTime - lastTimePlayersSeen > emptyServerThreshold) {
			console.log('Server has been empty for 15 minutes! Shutting down...');
			await emptyServerShutdown();
		}

		await new Promise(resolve => setTimeout(resolve, emptyServerInterval));
	}
}

async function emptyServerShutdown() {
	const message = await shutdownServer();
	if (message.includes('Error')) {
		await sendMessageToChannel(
			'Server was empty for too long, but had an error shutting down!'
		);
	} else {
		await sendMessageToChannel('Server has been shut down due to inactivity.');
	}
}

export async function sendMessageToChannel(message) {
	const endpoint = `channels/${process.env.BOT_CHANNEL_ID}/messages`;
	try {
		await DiscordRequest(endpoint, {
			method: 'POST',
			body: {
				content: message
			}
		});
		console.log('Message sent to channel: ' + message);
	} catch (err) {
		console.error(err);
	}
}

export async function sendMessageToServer(message) {
	if (!serverOnline) {
		return;
	} else {
		let data = JSON.stringify({
			message: message
		});

		const url = process.env.REST_URL + 'announce';
		let options = {
			method: 'POST',
			headers: {
				Authorization:
					`Basic ` +
					new Buffer.from(
						process.env.REST_USERNAME + ':' + process.env.REST_PASSWORD
					).toString('base64'),
				'Content-Type': 'application/json'
			},
			body: data
		};

		await fetch(url, options)
			.then(response => {
				console.log('Message sent to server: ' + message);
			})
			.catch(err => {
				console.log(err);
			});
	}
}
