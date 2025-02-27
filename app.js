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
	sendMessageToServer,
	monitorEmptyServer,
	commandKick,
	buildKickOptions,
	getPlayerNameFromSteamId,
	buildCancelKickOptions,
	cancelKick
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
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				// Send a message to the channel where command was triggered from
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

			// "kick" command
			if (name === 'kick') {
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				if (!isServerOnline()) {
					return res.send({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: 'The server is currently offline.'
						}
					});
				} else {
					// A message with a select menu
					let options;

					try {
						await res.send({
							type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
								flags: InteractionResponseFlags.EPHEMERAL
							}
						});
					} catch (err) {
						console.error(err);
					}

					options = buildKickOptions();

					try {
						await DiscordRequest(endpoint, {
							method: 'PATCH',
							body: {
								content: 'Who would you like to kick?',
								components: [
									{
										type: MessageComponentTypes.ACTION_ROW,
										components: [
											{
												type: MessageComponentTypes.STRING_SELECT,
												custom_id: 'kick_select_player',
												options: options
											}
										]
									}
								]
							}
						});
					} catch (err) {
						console.error(err);
					}
				}
				return;
			}

			// "cancel kick" command
			if (name === 'cancel-kick') {
				const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
				// A message with a select menu
				let options;

				try {
					await res.send({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							flags: InteractionResponseFlags.EPHEMERAL
						}
					});
				} catch (err) {
					console.error(err);
				}

				options = buildCancelKickOptions();

				try {
					await DiscordRequest(endpoint, {
						method: 'PATCH',
						body: {
							content: 'Which player would you like to cancel the kick for?',
							components: [
								{
									type: MessageComponentTypes.ACTION_ROW,
									components: [
										{
											type: MessageComponentTypes.STRING_SELECT,
											custom_id: 'cancel_kick_select_player',
											options: options
										}
									]
								}
							]
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

		// Handle requests from interactive components
		if (type === InteractionType.MESSAGE_COMPONENT) {
			// Respond to this message with another select box, this time asking for how long.
			const componentId = data.custom_id;

			if (componentId === 'kick_select_player') {
				const selectedOption = data.values[0];
				const userId = req.body.member.user.id;

				if (selectedOption === 'cancel') {
					return res.send({
						type: InteractionResponseType.UPDATE_MESSAGE,
						data: {
							content: `<@${userId}> has cancelled the kick command.`,
							components: []
						}
					});
				} else {
					const playerName = getPlayerNameFromSteamId(selectedOption);
					return res.send({
						type: InteractionResponseType.UPDATE_MESSAGE,
						data: {
							content: `When would you like to kick ${playerName}?`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [
								{
									type: MessageComponentTypes.ACTION_ROW,
									components: [
										{
											type: MessageComponentTypes.STRING_SELECT,
											// Send the player ID in the custom_id
											custom_id: 'kick_select_time' + selectedOption,
											options: [
												{
													label: 'Now',
													value: '0'
												},
												{
													label: 'In 15 minutes',
													value: '15'
												},
												{
													label: 'In 30 minutes',
													value: '30'
												},
												{
													label: 'In 45 minutes',
													value: '45'
												},
												{
													label: 'In 60 minutes',
													value: '60'
												},
												{
													label: 'In 90 minutes',
													value: '90'
												},
												{
													label: 'Nevermind!',
													value: 'cancel'
												}
											]
										}
									]
								}
							]
						}
					});
				}
			}

			if (componentId.includes('kick_select_time')) {
				const selectedOption = data.values[0];
				const playerToKick = componentId.replace('kick_select_time', '');
				const username = req.body.member.user.username;
				const userId = req.body.member.user.id;

				const playerName = getPlayerNameFromSteamId(playerToKick);

				if (selectedOption === 'cancel') {
					return res.send({
						type: InteractionResponseType.UPDATE_MESSAGE,
						data: {
							content: `<@${userId}> has cancelled the kick command.`,
							components: []
						}
					});
				} else {
					// Kick the player
					commandKick(playerToKick, selectedOption, username);
					let message;
					if (selectedOption === '0') {
						message = `<@${userId}> is kicking ${playerName} from the server!`;
					} else {
						message = `<@${userId}> will kick ${playerName} from the server in ${selectedOption} minutes!`;
					}

					// Update the message with confirmation.
					try {
						await res.send({
							type: InteractionResponseType.UPDATE_MESSAGE,
							data: {
								content: 'As you command...',
								components: []
							}
						});
					} catch (err) {
						console.error(err);
					}

					// Send a message to the channel where command was triggered from
					try {
						await sendMessageToChannel(message);
					} catch (err) {
						console.error(err);
					}
				}
				return;
			}

			if (componentId === 'cancel_kick_select_player') {
				const selectedOption = data.values[0];
				const userId = req.body.member.user.id;
				const username = req.body.member.user.username;

				if (selectedOption === 'cancel') {
					return res.send({
						type: InteractionResponseType.UPDATE_MESSAGE,
						data: {
							content: `<@${userId}> has cancelled the cancel kick command. IT'S CANCEL-CEPTION!`,
							components: []
						}
					});
				} else {
					const playerName = getPlayerNameFromSteamId(selectedOption);

					// Cancel the kick
					try {
						await cancelKick(selectedOption, username);
					} catch (err) {
						console.error(err);
					}

					// Update the message with confirmation.
					try {
						await res.send({
							type: InteractionResponseType.UPDATE_MESSAGE,
							data: {
								content: 'As you command...',
								components: []
							}
						});
					} catch (err) {
						console.error(err);
					}

					// Send a message to the channel where command was triggered from
					try {
						await sendMessageToChannel(
							`<@${userId}> has cancelled the kick for ${playerName}!`
						);
					} catch (err) {
						console.error(err);
					}
				}
				return;
			}
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
	const startUpdateDelay = 7000;
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
		res.status(200).send('OK');
	} catch (err) {
		console.error(err);
		res.status(500).send('Error');
	}
	console.log('Server is currenly online:', isServerOnline());
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

// Tell discord that the bot is online.
try {
	await sendMessageToChannel('I have AWOKEN!');
} catch (err) {
	console.error(err);
}

// Check to see if the server is currently running.
try {
	let message = await getServerStatus();
	console.log(message);
	if (message.includes('online')) {
		console.log('Server is online, starting monitor...');
		monitorEmptyServer();
	}
} catch (err) {
	console.error(err);
}
