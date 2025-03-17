'use strict';

const {
    ApplicationCommandOptionType,
    ApplicationCommandType, 
    EmbedBuilder
} = require('discord.js');

module.exports = {
    name: 'enviar',
    description: 'Enviar um link para algum usuário.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'user_id',
            description: 'Digite o identificador do usuário.',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'type',
            description: 'Selecione o tipo (1m|3m).',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: '1m', value: '1m' },
                { name: '3m', value: '3m' }
            ],
            required: true
        },
        {
            name: 'count',
            description: 'Insira a quantidade.',
            type: ApplicationCommandOptionType.Number,
            required: true
        }
    ],
    async run(client, interaction) {
        try {
            if (!client.config.owners.includes(interaction.user.id)) {
                return interaction.reply({
                    content: `:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
                    ephemeral: true
                });
            }

            await interaction.deferReply(); // Defer o mais cedo possível

            const user = await client.users.fetch(interaction.options.getString('user_id')).catch(() => null);
            const type = interaction.options.getString('type');
            const count = interaction.options.getNumber('count');

            if (!user?.id) {
                return interaction.editReply({
                    content: `:x: <@!${interaction.user.id}> Não consegui buscar por nenhum usuário com o identificador fornecido.`,
                    ephemeral: true
                });
            }

            const tokens = await client.db.tokens.find({ limitServer: false, type });

            if (count > tokens.length) {
                return interaction.editReply({
                    content: `:x: <@!${interaction.user.id}> O estoque atual é insuficiente para \`${count}\`. Há apenas \`${tokens.length}\` tokens disponíveis.`,
                    ephemeral: true
                });
            }

            const state = await client.functions.state(client);

            await client.db.links.create({
                invoiceID: 'null',
                count,
                state,
                type,
                channel_id: interaction.channel.id,
                bot_token: client.token,
                user_bought: interaction.user.id,
                create_inf: {
                    owner_id: client.config.owners[0],
                    bot_id: client.user.id,
                    time: client.functions.time()
                }
            });

            const link = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/doboosts&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
            const hour = parseInt(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit" }));

            try {
                await user.send(`😊 ・ Olá, <@!${user.id}>, **${hour >= 6 && hour < 12 ? "bom dia" : hour >= 12 && hour < 18 ? "boa tarde" : "boa noite"}**! Aqui está o link que você ganhou de **${interaction.user.username}** para **impulsionar o seu servidor**!\n➡️ ${link}`);
            } catch (e) {
                return interaction.editReply(`:x: <@!${interaction.user.id}> Não foi possível enviar o link para o usuário. Verifique se o ID está correto e se o usuário está com as mensagens diretas ativas.`);
            }

            return interaction.editReply(`:white_check_mark: <@!${interaction.user.id}> O link foi enviado com sucesso para **\`${user.username}\`**!`);
        } catch (error) {
            console.error(error);
            return interaction.editReply({
                content: `:x: Ocorreu um erro inesperado ao executar o comando. Por favor, tente novamente mais tarde.`,
                ephemeral: true
            });
        }
    }
};
