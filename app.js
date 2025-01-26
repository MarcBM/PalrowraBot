import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import {
	ButtonStyleTypes,
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import {
	isServerOnline,
	getPublicIP,
	getServerStatus,
	getPlayerList,
	startServer,
	commandShutdown,
	safeShutdown,
	sendMessageToChannel,
	sendMessageToServer
} from './palworld.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
	'/interactions',
	verifyKeyMiddleware(process.env.PUBLIC_KEY),
	async function (req, res) {
		// Interaction id, type and data
		const { id, type, data } = req.body;

		/**
		 * Handle verification requests
		 */
		if (type === InteractionType.PING) {
			return res.send({ type: InteractionResponseType.PONG });
		}

		/**
		 * Handle slash command requests
		 * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
		 */
		if (type === InteractionType.APPLICATION_COMMAND) {
			const { name } = data;

			// "test" command
			if (name === 'test') {
				// Send a message into the channel where command was triggered from
				try {
					await res.send({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							// Fetches a random emoji to send from a helper function
							content: `hello world ${getRandomEmoji()}`
						}
					});
				} catch (err) {
					console.error(err);
				}
				return;
			}

			// "ip" command
			if (name === 'ip') {
				// Send a message to the channel where command was triggered from
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				try {
					await res.send({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
					});
				} catch (err) {
					console.error(err);
				}
				// Get the public IP address
				const ip = await getPublicIP();
				// Send the IP address to the channel
				try {
					await DiscordRequest(endpoint, {
						method: 'PATCH',
						body: {
							content: ip
						}
					});
				} catch (err) {
					console.error(err);
				}
				return;
			}

			// "status" command
			if (name === 'status') {
				// Send a message to the channel where command was triggered from
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				try {
					await res.send({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
					});
				} catch (err) {
					console.error(err);
				}
				// Get the public IP address
				const message = await getServerStatus();
				// Send the IP address to the channel
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
				return;
			}

			// "players" command
			if (name === 'players') {
				// Send a message to the channel where command was triggered from
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				try {
					await res.send({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
					});
				} catch (err) {
					console.error(err);
				}
				// Get the player list.
				const message = await getPlayerList();
				// Send the player list to the channel
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
				return;
			}

			// "start" command
			if (name === 'start') {
				// Send a message to the channel where command was triggered from
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				try {
					await res.send({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
					});
				} catch (err) {
					console.error(err);
				}
				// Start the server
				const message = await startServer(req.body.token);
				// Confirm the server is starting
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
				return;
			}

			// "shutdown" command
			if (name === 'shutdown') {
				// Send a message to the channel where command was triggered from
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				try {
					await res.send({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
					});
				} catch (err) {
					console.error(err);
				}
				// Stop the server
				const message = await commandShutdown(req.body.token);
				// Confirm the server is shutting down
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
				return;
			}

			console.error(`unknown command: ${name}`);
			return res.status(400).json({ error: 'unknown command' });
		}

		console.error('unknown interaction type', type);
		return res.status(400).json({ error: 'unknown interaction type' });
	}
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/startUpdate', async function (req, res) {
	const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
	const message = req.body.message;
	const startUpdateDelay = 5000;
	await new Promise(resolve => setTimeout(resolve, startUpdateDelay));
	try {
		DiscordRequest(endpoint, {
			method: 'PATCH',
			body: {
				content: message
			}
		});
	} catch (err) {
		console.error(err);
	}
	return res.status(200).send('OK');
});

app.post('/macRestart', async function (req, res) {
	try {
		await sendMessageToChannel('Going down for a powernap in 10 minutes!');
	} catch (err) {
		console.error(err);
	}
	if (isServerOnline()) {
		try {
			await sendMessageToServer('Going down for a powernap in 10 minutes!');
		} catch (err) {
			console.error(err);
		}
		await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 9));
		try {
			await safeShutdown(60);
		} catch (err) {
			console.error(err);
		}
		await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 1));
	} else {
		await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 10));
	}
	try {
		await sendMessageToChannel('Nite nite!');
	} catch (err) {
		console.error(err);
	}
});

app.listen(PORT, () => {
	console.log('Listening on port', PORT);
});

try {
	await sendMessageToChannel('I have AWOKEN!');
} catch (err) {
	console.error(err);
}
