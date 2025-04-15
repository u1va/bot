const { Events, InteractionType } = require('discord.js');

module.exports = function (client) {
    client.on(Events.InteractionCreate, async function (interaction) {
        try {
            if (interaction.type === InteractionType.ApplicationCommand) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.run(client, interaction);
                return;
            }

            if (interaction.type === InteractionType.MessageComponent) {
                const [type] = interaction.customId.split('_');

                if (type === 'panel') {
                    require('./messageComponent')(client);
                    return;
                }

                if (['confirm', 'edit', 'cancel', 'quantity', 'proceed', 'return', 'save', 'discard'].includes(type)) {
                    require('./messageComponent')(client);
                    return;
                }
            }

        } catch (error) {
            console.error('[Error] Interaction handling failed:', error);

            const reply = {
                content: `:x: Ocorreu um erro ao processar sua interação. Por favor, tente novamente.`,
                flags: ["Ephemeral"]
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(reply).catch(console.error);
            } else {
                await interaction.reply(reply).catch(console.error);
            }
        }
    });
};