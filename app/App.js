console.clear();
console.log('[Logs] Initializing the process...');

const { GatewayIntentBits, Collection, Client } = require('discord.js');
const { MercadoPagoConfig } = require('mercadopago');
const Mongoose = require('mongoose');
const client = new Client({
    intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.Guilds
    ],
    fetchAllMembers: true
});

client.config = require('./assets/config');
client.mp = new MercadoPagoConfig({ accessToken: client.config.mercadopago_token });
client.functions = require('./assets/modules');
client.axios = require('axios').default;
client.commands = new Collection();
client.db = require('./models');

require('./handler').load(client);

Mongoose.set('strictQuery', false);
Mongoose.connect(client.config.mongo)
    .then(function () {
        console.log('[Logs] The database has been initialized successfully.');

        console.log('[Logs] Starting the client...');

        client.login(client.config.main_token);

        require('./express')(client);
    })
    .catch((e) => {
        console.error('[Logs] [FATAL] An error occurred during database initialization:\n', e.stack || e);

        process.exit(1);
    });

process.on('multipleResolutions', (type, reason, promise) => {
    console.log(`[Logs] ` + type, promise, reason);
});
process.on('unhandledRejection', (reason, promise) => {
    console.log(`[Logs] ` + reason, promise);
});
process.on('uncaughtException', (error, origin) => {
    console.log(`[Logs] ` + error, origin);
});
process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.log(`[Logs] ` + error, origin);
});