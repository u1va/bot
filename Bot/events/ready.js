'use strict';

const { Events } = require('discord.js');

module.exports = function(client) {
    client.on(Events.ClientReady, async function() {
        console.log('[Logs] The client was successfully initialized on %s.', client.user.username);
        console.log('[Logs] Initialization time:', new Date().toUTCString());
        
      // clear channels model
      await client.db.channels.deleteMany();
      
        // Thread Loading
        require('../threads/PaymentThread.js')(client);
      require('../threads/StockThread.js')(client);
    });
};