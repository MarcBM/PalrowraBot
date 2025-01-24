import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
	const choices = getRPSChoices();
	const commandChoices = [];

	for (let choice of choices) {
		commandChoices.push({
			name: capitalize(choice),
			value: choice.toLowerCase()
		});
	}

	return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
	name: 'test',
	description: 'Basic command',
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2]
};

// Get my public IP address. (Append port)

// Check if the server is online

// Start the Server

// Get List of Online Players

// Shut the Server Down (make sure to wait 40s before doing so.)

const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
