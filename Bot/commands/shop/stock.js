'use strict';

const { ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'estoque',
    description: 'Veja informações sobre o estoque atualmente disponível.',
    type: ApplicationCommandType.ChatInput,
    async run(client, interaction) {
        const tokens = await client.db.tokens.find({ limitServer: false });
        const oneMonthTokens = tokens.filter((token) => token.type === '1m').length;
        const threeMonthsTokens = tokens.filter((token) => token.type === '3m').length;

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📦 Estoque Bot de Impulsos')
                    .setDescription('🌟 Confira o estoque disponível no bot de impulsos e aproveite enquanto durar o estoque!')
                    .addFields(
                        { name: '🛒 **Produtos Disponíveis**', value: `> **1 Mês: \`${oneMonthTokens * 2} impulsos | ${oneMonthTokens} tokens\`\n> 3 Meses: \`${threeMonthsTokens * 2} impulsos | ${threeMonthsTokens} tokens\`**`, inline: true },
                        { name: '⏳ **Solicitado em**', value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '📌 **Informações Importantes**', value: '> ✅ Estoque estável.\n> 💰 Essa mensagem não será atualizada quando houver novas alterações.' }
                    )
                    .setFooter({
                        text: 'Vendas rápidas, seguras e confiáveis!',
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp()
                    .setColor('#2a2d30')
            ],
            ephemeral: true
        });
    }
};
