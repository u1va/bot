'use strict';

const { Events } = require('discord.js');

module.exports = function(client) {
    client.on(Events.InteractionCreate, async function(interaction) {
        if (!interaction.isChatInputCommand() || !interaction.guild) return console.log("Interacao recebida (not chatinput)");
        
        const command = client.commands.get(interaction.commandName);
        
        if (!command) return;
        
        try {
            await command.run(client, interaction);
        } catch(e) {
            console.error('[Logs] Error executing command "%s":\n', command.name, e.stack || e);
            
            return (interaction.deferred || interaction.replied ? interaction.editReply : interaction.reply)
                .call(
                    interaction,
                    `:x: <@!${interaction.user.id}> Desculpe-me pela inconveniência, mas algo deu errado durante a execução desse comando. Caso esse erro persista, entre em contato com a equipe de suporte.`
                );
        }
    });
};