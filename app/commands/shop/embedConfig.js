const {
    ApplicationCommandType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    name: 'config_embed',
    description: 'Configuração das embeds.',
    type: ApplicationCommandType.ChatInput,
    async run(client, interaction) {

        const embed = new EmbedBuilder()
            .setTitle('Configuração')
            .setDescription('Selecione abaixo qual embed quer editar!')
            .setFooter({
                text: '© 2024–2025 Estern Bot\'s. Todos os direitos reservados.',
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp()
            .setColor('#2a2d30');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('editar_impulsos')
                .setLabel('Impulsos')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('editar_nitradas')
                .setLabel('Nitrada')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('editar_membros')
                .setLabel('Membros')
                .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
