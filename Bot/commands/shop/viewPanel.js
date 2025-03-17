'use strict';

const {
    ApplicationCommandOptionType,
    StringSelectMenuBuilder,
    ApplicationCommandType,
    PermissionFlagsBits,
    ActionRowBuilder,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

module.exports = {
    name: 'painel',
    description: 'Envie o painel de produtos para um canal específico.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'channel',
            description: 'Canal onde o painel será enviado.',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true
        }
    ],
    async run(client, interaction) {
        if (!client.config.owners.includes(interaction.user.id)) {
            return interaction.reply({
                content: `:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: `:x: <@!${interaction.user.id}> O bot não tem permissões suficientes para executar este comando.`,
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel('channel');

        try {
            const tokens = await client.db.tokens.find({ limitServer: false });
            const oneMonthTokens = tokens.filter(s => s.type === '1m').length;
            const threeMonthsTokens = tokens.filter(s => s.type === '3m').length;

            // Criação do customId
            const customId = `panel_${interaction.id}_${channel.id}`;

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(customId) // Adicionando customId
                .setPlaceholder('Selecione um Produto')
                .addOptions(
                    {
                        label: '2 Impulsos Mensal',
                        description: `Valor: R$${client.config.price_1m.toFixed(2)} | Estoque: ${oneMonthTokens}`,
                        value: '1m'
                    },
                    {
                        label: '2 Impulsos Trimensal',
                        description: `Valor: R$${client.config.price_3m.toFixed(2)} | Estoque: ${threeMonthsTokens}`,
                        value: '3m'
                    }
                );

            const embed = new EmbedBuilder()
                .setTitle('Impulsos Automáticos')
                .setDescription(
                    '<:est_etg0:1289814030634192918><:est_etg1:1242105268108529676><:est_etg2:1242105327214923787><:est_etg3:1242105375809867816><:est_etg4:1242105408550600778><:est_etg5:1242105444458037277><:est_etg6:1242105477450432653><:est_etg7:1242105504226873385>\n' +
                    'Entrega realizada de forma automática\n' +
                    'Sem qualquer tipo de marca d\'água\n' +
                    'Revenda livre, sem comprometer o seu cliente\n' +
                    '\n' +
                    '⚠️ Importante:\n' +
                    ' - Remova bots ou configurações de anti-bot do seu servidor\n' +
                    'Caso nossas contas forem removidas com impulsos entregues, não iremos reembolsar ou lhe mandar mais impulsos\n' +
                    '\n' +
                    '⚡ Como a entrega funciona\n' +
                    'https://www.youtube.com/watch?v=wd6fqBGJshA'
                )
                .setColor('#2a2d30')
                .setFooter({
                    text: 'Entrega Automática',
                    iconURL: client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            const message = await channel.send({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            });

            // Salvar o customId junto com o channelId e messageId no banco
            await client.db.panels.create({
                channelId: channel.id,
                messageId: message.id,
                customId: customId // Salvando o customId
            });

            interaction.reply({
                content: `:white_check_mark: <@!${interaction.user.id}> Painel de produtos enviado para o canal <#${channel.id}>!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[Logs] [painel] Erro ao buscar tokens ou salvar painel:', error);
            interaction.reply({
                content: ':x: Ocorreu um erro ao processar o comando.',
                ephemeral: true
            });
        }
    }
};