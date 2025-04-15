const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const { customId } = interaction;

        // Função para criar a embed e botões dinamicamente
        const sendEmbedWithButtons = async (title, description, customIdsPrefix) => {
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor('#5865F2');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_1`)
                    .setLabel('Título da embed')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_2`)
                    .setLabel('Descrição da embed')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_3`)
                    .setLabel('Rodapé da embed')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_4`)
                    .setLabel('Place Holder')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_5`)
                    .setLabel('Cor da embed')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_6`)
                    .setLabel('Banner')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customIdsPrefix}_7`)
                    .setLabel('Miniatura')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
        };

        if (customId === 'editar_impulsos') {
            await sendEmbedWithButtons('Editar Impulsos', 'Escolha uma das opções abaixo para editar impulsos:', 'impulsos');
        }

        else if (customId === 'editar_nitradas') {
            await sendEmbedWithButtons('Editar Nitradas', 'Escolha uma das opções abaixo para editar nitradas:', 'nitradas');
        }

        else if (customId === 'editar_membros') {
            await sendEmbedWithButtons('Editar Membros', 'Escolha uma das opções abaixo para editar membros:', 'membros');
        }
    }
};
