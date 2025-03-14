'use strict';

const { readdirSync, lstatSync } = require('node:fs');
const { Events } = require('discord.js');
const path = require('node:path');

/**
 * File responsible for registering and manipulating files of commands, events, fonts and threads
 * @prop {Function} load  responsible for execute all functions
 * @prop {Function} loadCommands  responsible for load the client commands
 * @prop {Function} loadEvents  responsible for load client events
 */
module.exports = {
    load: function(client) {
        console.log('[Logs] Loading client events and commands...');
        
        this.loadCommands(client);
        this.loadEvents(client);
    },
    loadCommands: function(client) {
        console.log('[Logs] Loading client commands...');
        
        const folder = path.join(__dirname, 'commands');
        
        readdirSync(folder)
            .forEach((subfolder) => {
                subfolder = path.join(folder, subfolder);
                
                if (!lstatSync(subfolder).isDirectory()) return;
                
                for (const filename of readdirSync(subfolder)) {
                    let command;
                    
                    try {
                        command = require(path.join(subfolder, filename));
                    } catch(e) {
                        console.error('[Logs] Error detected:\n', e.stack || e);
                        
                        continue;
                    }
                    
                    if (!command.name || !command.description || !command.run) {
                        console.warn(`[Logs] Missing properties in "${filename}" (name, description or run).`);
                        
                        continue;
                    }
                    
                    client.commands.set(command.name, command);
                }
            });
        
        if (client.commands.size > 0) client.on(Events.ClientReady, async() => {
            await client.application.commands.set(client.commands.toJSON());
            
            console.log('[Logs] %d commands were successfully loaded!', client.application.commands.cache.size);
        });
    },
    loadEvents: function(client) {
        console.log('[Logs] Loading the events defined for the client...');
        
        const folder = path.join(__dirname, 'events');
        
        readdirSync(folder)
            .forEach((event) =>
                require(path.join(folder, event))(client)
            );
        
        console.log('[Logs] Client events are been loaded.');
    }
};