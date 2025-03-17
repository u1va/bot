'use strict';

const { ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tokens',
    description: 'Veja informações sobre o estoque já utilizado.',
    type: ApplicationCommandType.ChatInput,
    async run(client, interaction) {
        if (!client.config.owners.includes(interaction.user.id)) {
            return interaction.reply({
                content: `**    **:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
                ephemeral: true
            });
        }
    
        // Deferindo a resposta para evitar timeout
        await interaction.deferReply({ ephemeral: true });
    
        try {
            const tokens = await client.db.tokens.find({});
            const oneMonthTokens = tokens.filter((s) => s.type === '1m').length;
            const threeMonthsTokens = tokens.filter((s) => s.type === '3m').length;
    
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📜  **Relatório de Tokens**')
                        .setDescription('🔍   **Detalhes sobre o estoque do bot já utilizados:**')
                        .addFields(
                            { 
                                name: ':star:  ・  **Tokens de 1 Mês**', 
                                value: `🎯   Impulsos Utilizados: **\` ${oneMonthTokens * 2} \`**\n📦   Tokens Totais: **\` ${oneMonthTokens} \`**\n🗓️   Validade: **30 dias**`,
                                inline: true 
                            },
                            { 
                                name: '🌟  ・  **Tokens de 3 Meses**', 
                                value: `🎯   Impulsos Utilizados: **\` ${threeMonthsTokens * 2} \`**\n📦   Tokens Totais: **\` ${threeMonthsTokens} \`**\n🗓️   Validade: **90 dias**`,
                                inline: true 
                            }
                        )
                        .setFooter({ text: `Por: ${interaction.user.username}`, iconURL: interaction.user.avatarURL() })
                        .setTimestamp()
                        .setColor('#2a2d30')
                ]
            });
    
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao buscar os tokens. Tente novamente mais tarde.' });
        }
    }    
};