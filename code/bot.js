// --- REQUIRED LIBRARIES ---
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    Collection,
    Events
} = require('discord.js');
const fs = require('fs');       
const path = require('path');

// --- CONFIGURATION ---
// IMPORTANT: REPLACE THESE VALUES WITH YOUR BOT'S INFORMATION
// --- CONFIGURATION ---
// We will set these in the Railway project settings
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = "1323511767552491570"; // FILL IN YOUR CLIENT ID
const OWNER_ID = "1150785744135278602"; // FILL IN YOUR DISCORD USER ID
// --- END OF CONFIGURATION ---

const balanceFilePath = path.join(__dirname, 'balances.json');

// --- DATA HANDLING FUNCTIONS ---
// These functions manage the balances.json file.

/**
 * Loads the balances from the JSON file.
 * @returns {Object} The user balances.
 */
function loadData() {
    if (!fs.existsSync(balanceFilePath)) {
        return {};
    }
    try {
        const fileContent = fs.readFileSync(balanceFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading or parsing balances.json:", error);
        return {};
    }
}

/**
 * Saves the provided data to the JSON file.
 * @param {Object} data The data object to save.
 */
function saveData(data) {
    fs.writeFileSync(balanceFilePath, JSON.stringify(data, null, 4));
}

/**
 * Gets the balance of a specific user.
 * @param {string} userId The Discord user ID.
 * @returns {number} The user's balance.
 */
function getBalance(userId) {
    const data = loadData();
    return data[userId] || 0;
}

/**
 * Updates a user's balance by a given amount (can be positive or negative).
 * @param {string} userId The Discord user ID.
 * @param {number} amount The amount to add or remove.
 * @returns {number} The user's new balance.
 */
function updateBalance(userId, amount) {
    const data = loadData();
    const currentBalance = data[userId] || 0;
    data[userId] = currentBalance + amount;
    saveData(data);
    return data[userId];
}

// --- COMMAND DEFINITIONS ---
// All of your bot's slash commands are defined here.

const commands = [
    // /balance command
    {
        data: new SlashCommandBuilder()
            .setName('balance')
            .setDescription("Check your or another user's balance.")
            .addUserOption(option =>
                option.setName('user')
                .setDescription("The user whose balance you want to see.")
                .setRequired(false)),
        async execute(interaction) {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const balance = getBalance(targetUser.id);
            const embed = new EmbedBuilder()
                .setTitle(`💰 ${targetUser.username}'s Balance`)
                .setDescription(`They have **${balance}** Robux.`)
                .setColor('Gold');
            await interaction.reply({ embeds: [embed] });
        },
    },
    // /daily command
    {
        data: new SlashCommandBuilder()
            .setName('daily')
            .setDescription('Claim your daily 1 Robux.'),
        cooldown: 86400, // 24 hours in seconds
        async execute(interaction) {
            const reward = 1;
            const newBalance = updateBalance(interaction.user.id, reward);
            const embed = new EmbedBuilder()
                .setTitle('🎉 Daily Reward Claimed!')
                .setDescription(`You have received **${reward}** Robux.\nYour new balance is now **${newBalance}** Robux.`)
                .setColor('Green');
            await interaction.reply({ embeds: [embed] });
        },
    },
    // /bet command
    {
        data: new SlashCommandBuilder()
            .setName('bet')
            .setDescription('Bet your Robux for a chance to double it!')
            .addIntegerOption(option =>
                option.setName('amount')
                .setDescription('The amount of Robux you want to bet (max 5).') // Updated description
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5)), // <<< THIS IS THE ADDED LINE
        async execute(interaction) {
            const amount = interaction.options.getInteger('amount');
            const userId = interaction.user.id;
            const currentBalance = getBalance(userId);

            if (amount > currentBalance) {
                return interaction.reply({ content: "❌ You don't have enough Robux to make that bet.", ephemeral: true });
            }

            const winChance = 0.40; // 40% chance to win
            const roll = Math.random();
            let embed;

            if (roll < winChance) {
                const newBalance = updateBalance(userId, amount);
                embed = new EmbedBuilder()
                    .setTitle('🎉 You Won!')
                    .setDescription(`You bet **${amount}** and won! You doubled your stake.\nYour new balance is **${newBalance}** Robux.`)
                    .setColor('Green');
            } else {
                const newBalance = updateBalance(userId, -amount);
                embed = new EmbedBuilder()
                    .setTitle('💀 You Lost!')
                    .setDescription(`You bet **${amount}** and lost it all.\nYour new balance is **${newBalance}** Robux.`)
                    .setColor('Red');
            }
            await interaction.reply({ embeds: [embed] });
        },
    },
    // /addbalance command (Owner Only)
    {
        data: new SlashCommandBuilder()
            .setName('addbalance')
            .setDescription("[Owner Only] Add Robux to a user's balance.")
            .addUserOption(option => option.setName('user').setDescription('The user to give Robux to.').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('The amount to give.').setRequired(true).setMinValue(1)),
        async execute(interaction) {
            if (interaction.user.id !== OWNER_ID) {
                return interaction.reply({ content: '🚫 You do not have permission to use this command.', ephemeral: true });
            }
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const newBalance = updateBalance(user.id, amount);
            await interaction.reply({ content: `✅ Successfully added **${amount}** Robux to ${user.username}. Their new balance is **${newBalance}**.`, ephemeral: true });
        },
    },
    // /deductbalance command (Owner Only)
    {
        data: new SlashCommandBuilder()
            .setName('deductbalance')
            .setDescription("[Owner Only] Deduct Robux from a user's balance.")
            .addUserOption(option => option.setName('user').setDescription('The user to take Robux from.').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('The amount to deduct.').setRequired(true).setMinValue(1)),
        async execute(interaction) {
            if (interaction.user.id !== OWNER_ID) {
                return interaction.reply({ content: '🚫 You do not have permission to use this command.', ephemeral: true });
            }
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const newBalance = updateBalance(user.id, -amount);
            await interaction.reply({ content: `✅ Successfully deducted **${amount}** Robux from ${user.username}. Their new balance is **${newBalance}**.`, ephemeral: true });
        },
    }
];

// --- BOT INITIALIZATION ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands into the client
for (const command of commands) {
    client.commands.set(command.data.name, command);
}

// --- COMMAND DEPLOYMENT ---
// This part registers the slash commands with Discord.
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const commandData = commands.map(cmd => cmd.data.toJSON());
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID), { body: commandData },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();

// --- BOT EVENTS ---

// When the bot is ready
client.once(Events.ClientReady, () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`Bot is active and commands are registered.`);
});

// When an interaction (slash command) is created
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Cooldown handling
    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 0) * 1000;

    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = Math.floor(timeLeft % 60);
            return interaction.reply({ content: `⏳ Please wait ${hours}h ${minutes}m ${seconds}s before reusing the \`${command.data.name}\` command.`, ephemeral: true });
        }
    }
    
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    
    // Execute the command
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

// --- LOGIN ---
// Check if tokens are placeholders before logging in
if (BOT_TOKEN === "" || CLIENT_ID === "" || OWNER_ID === "") {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ERROR: Please replace the placeholder values in the  !!!");
    console.error("!!!       configuration section before running the bot.  !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
} else {
    client.login(BOT_TOKEN);
}