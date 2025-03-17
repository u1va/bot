'use strict';

// Initializing...
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

// Important properties
client.config = require('./assets/config');
client.mp = new MercadoPagoConfig({ accessToken: client.config.mercadopago_token });
client.functions = require('./assets/modules');
client.axios = require('axios').default;
client.commands = new Collection();
client.db = require('./models');

// Setup (load commands and events)
require('./handler').load(client);

// Database initialization
Mongoose.set('strictQuery', false);
Mongoose.connect(client.config.mongo)
    .then(function() {
        console.log('[Logs] The database has been initialized successfully.');

        // Initializing the client
        console.log('[Logs] Starting the client...');
        
        client.login(client.config.main_token);
        
        // Initializing web server
        require('./express')(client);
    })
    .catch((e) => {
        console.error('[Logs] [FATAL] An error occurred during database initialization:\n', e.stack || e);
        
        process.exit(1);
    });