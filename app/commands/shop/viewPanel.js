const {
    ApplicationCommandOptionType,
    StringSelectMenuBuilder,
    ApplicationCommandType,
    PermissionFlagsBits,
    ActionRowBuilder,
    EmbedBuilder,
    ChannelType
} = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'painel',
    description: 'Envie o painel de produtos para um canal específico.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'type',
            description: 'Tipo de painel a ser enviado',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Impulsos', value: 'boosts' },
                { name: 'Membros', value: 'members' },
                { name: 'Contas Nitro', value: 'tokens' }
            ]
        },
        {
            name: 'channel',
            description: 'Canal onde o painel será enviado.',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false
        }
    ],
    async run(client, interaction) {
        if (!client.config.owners.includes(interaction.user.id)) {
            return interaction.reply({
                content: `:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
                flags: ["Ephemeral"]
            });
        }

        const panelType = interaction.options.getString('type');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const customId = `panel_${interaction.id}_${channel.id}`;

        try {
            const tokens = await client.db.tokens.find({ limitServer: false });
            const badtokens = await client.db.tokens.find({ limitServer: true, badtoken: false });
            const oneMonthTokens = tokens.filter(s => s.type === '1m').length;
            const threeMonthsTokens = tokens.filter(s => s.type === '3m').length;
            const onlineMembers = badtokens.filter(token => token.nitrada === true).length;
            const offlineMembers = badtokens.filter(token => token.nitrada === false).length;            
            const embedImpulsos = JSON.parse(fs.readFileSync('./assets/embedImpulsos.json', 'utf-8'));
            const embedNitrada = JSON.parse(fs.readFileSync('./assets/embedNitrada.json', 'utf-8'));
            const embedMembros = JSON.parse(fs.readFileSync('./assets/embedMembros.json', 'utf-8'));
            const fixedDescription = `<:121:1349480374367027321><:122:1349480413273260147><:123:1349480438128836651><:124:1349480453647761500><:125:1349480467463929877><:126:1349480485536927774><:127:1349480500615450727><:128:1349480526326534176>`;

            let selectMenu;
            let embed;

            if (panelType === 'boosts') {
                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Selecione um produto')
                    .addOptions([
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
                    ]);

                embed = new EmbedBuilder()
                    .setTitle(embedImpulsos.title)
                    .setDescription(`${fixedDescription}\n${embedImpulsos.description || ''}`)
                    .setThumbnail(embedImpulsos.thumbnail)
                    .setImage(embedImpulsos.image)
                    .setColor(embedImpulsos.color);

            } else if (panelType === 'members') {
                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Selecione um produto')
                    .addOptions([
                        {
                            label: 'Membros Online',
                            description: `Valor: R$${client.config.price_members_ons.toFixed(2)} | Estoque: ${onlineMembers}`,
                            value: 'ons'
                        },
                        {
                            label: 'Membros Offline',
                            description: `Valor: R$${client.config.price_members_offs.toFixed(2)} | Estoque: ${offlineMembers}`,
                            value: 'offs'
                        }
                    ]);

                embed = new EmbedBuilder()
                    .setTitle(embedMembros.title)
                    .setDescription(`${fixedDescription}\n${embedMembros.description || ''}`)
                    .setThumbnail(embedMembros.thumbnail)
                    .setImage(embedMembros.image)
                    .setColor(embedMembros.color);
            } else if (panelType === 'tokens') {
                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Selecione um produto')
                    .addOptions([
                        {
                            label: 'Nitrada Mensal',
                            description: `Valor: R$${client.config.price_n1m.toFixed(2)} | Estoque: ${oneMonthTokens}`,
                            value: 'n1m'
                        },
                        {
                            label: 'Nitrada Trimensal',
                            description: `Valor: R$${client.config.price_n3m.toFixed(2)} | Estoque: ${threeMonthsTokens}`,
                            value: 'n3m'
                        }
                    ]);

                embed = new EmbedBuilder()
                    .setTitle(embedNitrada.title)
                    .setDescription(`${fixedDescription}\n${embedNitrada.description || ''}`)
                    .setThumbnail(embedNitrada.thumbnail)
                    .setImage(embedNitrada.image)
                    .setColor(embedNitrada.color);
            }

            embed.setFooter({
                text: 'Entrega Automática',
                iconURL: client.user.displayAvatarURL({ dynamic: true })
            }).setTimestamp();

            const message = await channel.send({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            });

            await client.db.panels.create({
                channelId: channel.id,
                messageId: message.id,
                customId: customId,
                type: panelType
            });

            return interaction.reply({
                content: `:white_check_mark: <@!${interaction.user.id}> Painel de ${panelType === 'boost' ? 'impulsos' : panelType === 'members' ? 'membros' : 'nitro'} enviado para o canal <#${channel.id}>!`,
                flags: ["Ephemeral"]
            });

        } catch (error) {
            console.error('[Logs] [painel]', error);
            return interaction.reply({
                content: ':x: Ocorreu um erro ao processar o comando.',
                flags: ["Ephemeral"]
            });
        }
    }
};