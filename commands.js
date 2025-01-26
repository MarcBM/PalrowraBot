import 'dotenv/config';
import {
	capitalize,
	InstallGuildCommands,
	InstallGlobalCommands
} from './utils.js';

// Simple test command
const TEST_COMMAND = {
	name: 'test',
	description: 'Basic command',
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2]
};

// Get my public IP address. (Append port)
const IP_COMMAND = {
	name: 'ip',
	description: 'Get the current IP of the Palworld Server',
	type: 1
};

// Check if the server is online
const STATUS_COMMAND = {
	name: 'status',
	description: 'Check if the Palworld Server is online',
	type: 1
};

// Start the Server
const START_COMMAND = {
	name: 'start',
	description: 'Start the Palworld Server',
	type: 1
};

// Get List of Online Players
const PLAYERS_COMMAND = {
	name: 'players',
	description: 'Get a list of online players',
	type: 1
};

// Shut the Server Down (make sure to wait 40s before doing so.)
const SHUTDOWN_COMMAND = {
	name: 'shutdown',
	description: 'Shutdown the Palworld Server',
	type: 1
};

// Kick a player (either now or in x minutes)
const KICK_COMMAND = {
	name: 'kick',
	description: 'Kick a player from the server',
	type: 1
};

const GUILD_COMMANDS = [
	TEST_COMMAND,
	IP_COMMAND,
	STATUS_COMMAND,
	START_COMMAND,
	PLAYERS_COMMAND,
	SHUTDOWN_COMMAND,
	KICK_COMMAND
];

const GLOBAL_COMMANDS = [];

InstallGuildCommands(process.env.APP_ID, process.env.GUILD_ID, GUILD_COMMANDS);

InstallGlobalCommands(process.env.APP_ID, GLOBAL_COMMANDS);
