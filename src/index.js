require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});
// Webserver für UptimeRobot
const express = requrie('express');
const app = express();
const port = 3000;

app.get('/', (rep, res) => {
    res.send('Bot ist online!');
});

app.listen(port, () => {
    console.log('Web-Server läuft auf Port ${port}');
});

// WICHTIG: Die Boxen MÜSSEN ganz oben erstellt werden, bevor die Ordner ausgelesen werden!
client.commands = new Collection();
const commands = [];

// 1. SYSTEM: Commands aus dem Ordner "commands" laden
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const imported = require(filePath);
        
        // Falls die Datei ein Array von Befehlen exportiert (wie moderation.js)
        const commandArray = Array.isArray(imported) ? imported : [imported];
        
        for (const command of commandArray) {
            if (command && 'data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            }
        }
    }
}

// 2. SYSTEM: Events aus dem Ordner "event" laden
const eventsPath = path.join(__dirname, 'event');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Slash Commands bei Discord registrieren (Express-Registrierung)
client.once(Events.ClientReady, async () => {
    console.log(`🤖 ${client.user.tag} ist erfolgreich online!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const SERVER_ID = '1251611493779243122';

    try {
        console.log('⏳ Slash-Commands werden direkt für den Server registriert...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, SERVER_ID),
            { body: commands },
        );
        console.log('✅ Alle Slash-Commands erfolgreich auf dem Server registriert!');
    } catch (error) {
        console.error(error);
    }
});

// Interaction Handler für Commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Es gab einen Fehler beim Ausführen des Befehls!', ephemeral: true });
    }
});

// ==========================================
// ⚡ FUNKTION: AUTOMATISCHE ANTWORT (ZEITUNG)
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const ZIEL_KANAL_ID = '1481055112209105046';

    if (message.channel.id === ZIEL_KANAL_ID) {
        try {
            await message.channel.send(`<@&1481039398408687727> eine Neue Zeitung ist da!`);
        } catch (error) {
            console.error('Fehler beim Senden der Zeitungs-Benachrichtigung:', error);
        }
    }
});

// Bot einloggen
client.login(process.env.DISCORD_TOKEN);