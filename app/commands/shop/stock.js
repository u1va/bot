const { ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'estoque',
    description: 'Veja informações sobre o estoque atualmente disponível.',
    type: ApplicationCommandType.ChatInput,
    async run(client, interaction) {
        const oneMonthTokens = await client.db.tokens.countDocuments({
            limitServer: false,
            type: '1m',
        });
        
        const threeMonthsTokens = await client.db.tokens.countDocuments({
            limitServer: false,
            type: '3m',
        });

        const offlineMembers = await client.db.tokens.countDocuments({
            limitServer: true,
            nitrada: false,
            badtoken: false,
        });

        const onlineMembers = await client.db.tokens.countDocuments({
            limitServer: true,
            nitrada: true,
            badtoken: false,
        });

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📦 Estoque Bot')
                    .setDescription('🌟 Confira o estoque disponível e aproveite!')
                    .addFields(
                        { 
                            name: '🚀 **Impulsos**', 
                            value: `> **1 Mês:** \`${oneMonthTokens * 2} impulsos | ${oneMonthTokens} tokens\`\n> **3 Meses:** \`${threeMonthsTokens * 2} impulsos | ${threeMonthsTokens} tokens\``,
                            inline: false 
                        },
                        { 
                            name: '🎁 **Nitradas**', 
                            value: `> **1 Mês:** \`${oneMonthTokens} tokens\`\n> **3 Meses:** \`${threeMonthsTokens} tokens\``,
                            inline: false 
                        },
                        {
                            name: '👥 **Membros**',
                            value: `> **Online:** \`${onlineMembers} membros\`\n> **Offline:** \`${offlineMembers} membros\``,
                            inline: false
                        }
                    )
                    .setFooter({
                        text: 'Vendas rápidas, seguras e confiáveis!',
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp()
                    .setColor('#2a2d30')
            ],
            flags: ["Ephemeral"]
        });
    }
};
