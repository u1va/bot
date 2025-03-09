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
        },
        {
            name: 'tipo',
            description: 'Tipo do painel.',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Impulsos', value: 'impulsos' },
                { name: 'Nitradas', value: 'nitradas' },
                { name: 'Membros', value: 'members' }
            ]
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
        const tipo = interaction.options.getString('tipo');
        
        try {
            let tokens = [];
            let options = [];
            let embed;

            if (tipo === 'impulsos') {
                tokens = await client.db.tokens.find({ limitServer: false });
                const oneMonthTokens = tokens.filter(s => s.type === '1m').length;
                const threeMonthsTokens = tokens.filter(s => s.type === '3m').length;
                
                options = [
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
                ];

                embed = new EmbedBuilder()
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
            } else if (tipo === 'nitradas') {
                tokens = await client.db.tokens.find({ limitServer: false });
                const oneMonthTokens = tokens.filter(s => s.type === '1m').length;
                const threeMonthsTokens = tokens.filter(s => s.type === '3m').length;
                
                options = [
                    {
                        label: 'Nitrada 1 Mês',
                        description: `Valor: R$${client.config.price_nitrada_1m.toFixed(2)} | Estoque: ${oneMonthTokens}`,
                        value: 'n1m'
                    },
                    {
                        label: 'Nitrada 3 Mês',
                        description: `Valor: R$${client.config.price_nitrada_3m.toFixed(2)} | Estoque: ${threeMonthsTokens}`,
                        value: 'n3m'
                    }
                ];

                embed = new EmbedBuilder()
                    .setTitle('Conta Nitrada')
                    .setDescription(
                        '<:est_etg0:1289814030634192918><:est_etg1:1242105268108529676><:est_etg2:1242105327214923787><:est_etg3:1242105375809867816><:est_etg4:1242105408550600778><:est_etg5:1242105444458037277><:est_etg6:1242105477450432653><:est_etg7:1242105504226873385>\n' +
                        'Entrega realizada de forma automática\n' +
                        'Sem qualquer tipo de marca d\'água\n' +
                        'Revenda livre, sem comprometer o seu cliente\n' +
                        '\n' +
                        '⚠️ Importante:\n' +
                        ' - Em caso de mal funcionamento das contas, só iremos aceitar trocas com gravações\n' +
                        '\n' +
                        '⚡ Como a entrega funciona\n' +
                        'O bot vai lhe mandar nesse formato as informações da compra\n' +
                        '**E-MAIL:SENHA:TOKEN** ou dependendo do estoque apens **TOKEN**'
                    )
                    .setColor('#2a2d30')
                    .setFooter({
                        text: 'Entrega Automática',
                        iconURL: client.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();
            } else if (tipo === 'members') {
                tokens = await client.db.tokens.find({ limitServer: true, nitrada: false, badtoken: false });
                
                options = [
                    {
                        label: 'Membros Disponíveis',
                        description: `Valor: R$${client.config.price_membros.toFixed(2)} | Quantidade: ${tokens.length}`,
                        value: 'members'
                    }
                ];

                embed = new EmbedBuilder()
                    .setTitle('Membros Automáticos')
                    .setDescription(
                        '<:est_etg0:1289814030634192918><:est_etg1:1242105268108529676><:est_etg2:1242105327214923787><:est_etg3:1242105375809867816><:est_etg4:1242105408550600778><:est_etg5:1242105444458037277><:est_etg6:1242105477450432653><:est_etg7:1242105504226873385>\n' +
                        'Entrega realizada de forma automática\n' +
                        'Sem qualquer tipo de marca d\'água\n' +
                        'Revenda livre, sem comprometer o seu cliente\n' +
                        '\n' +
                        '⚠️ Importante:\n' +
                        ' - Remova bots ou configurações de anti-bot do seu servidor\n' +
                        'Caso nossas contas sejam removidas, só enviaremos mais membros apenas uma vez.\n' +
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
            }

            const customId = `panel_${interaction.id}_${channel.id}_${tipo}`;

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(customId)
                .setPlaceholder('Selecione um Produto')
                .addOptions(options);

            const message = await channel.send({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            });

            await client.db.panels.create({
                channelId: channel.id,
                messageId: message.id,
                customId: customId,
                type: tipo
            });

            interaction.reply({
                content: `:white_check_mark: <@!${interaction.user.id}> Painel de **${tipo}** enviado para o canal <#${channel.id}>!`,
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
