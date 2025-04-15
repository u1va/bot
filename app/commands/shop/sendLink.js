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
            name: 'usuario',
            description: 'Digite o identificador do usuário.',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'tipo',
            description: 'Selecione um tipo.',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Impulsos', value: 'boosts' },
                { name: 'Membros', value: 'members' }
            ],
            required: true
        },
        {
            name: 'tipo2',
            description: 'Tipo para o link.',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Mensal', value: '1m' },
                { name: 'Trimensal', value: '3m' },
                { name: 'Online', value: 'ons' },
                { name: 'Offline', value: 'offs' }
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
                    flags: ["Ephemeral"]
                });
            }

            await interaction.deferReply();

            const user = await client.users.fetch(interaction.options.getString('usuario')).catch(() => null);

            if (!user?.id) {
                return interaction.editReply({
                    content: `:x: <@!${interaction.user.id}> Não consegui buscar por nenhum usuário com o identificador fornecido.`,
                    flags: ["Ephemeral"]
                });
            }

            let query;
            let link;
            let path;
            const productType = interaction.options.getString('tipo2');
            const count = interaction.options.getNumber('count');
            
            switch (productType) {
                case '1m':
                    query = { type: productType, limitServer: false };
                    path = 'doboosts';
                    break;
                case '3m':
                    query = { type: productType, limitServer: false };
                    path = 'doboosts';
                    break;
                case 'ons':
                    query = { limitServer: true, nitrada: true, badtoken: false };
                    path = 'domembers';
                    break;
                case 'offs':
                    query = { limitServer: true, nitrada: false, badtoken: false };
                    path = 'domembers';
                    break;
                default:
                    return interaction.editReply({
                        content: `:x: Tipo inválido fornecido.`,
                        flags: ['Ephemeral']
                    });
            }
            
            const tokens = await client.db.tokens.find(query).limit(count);
            if (tokens.length < count) {
                return interaction.editReply({
                    content: `:x: <@!${interaction.user.id}> O estoque atual é insuficiente para \`${count}\`. Há apenas \`${tokens.length}\` tokens disponíveis.`,
                    flags: ['Ephemeral']
                });
            }
            
            const state = await client.functions.state(client);
            link = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/${path}&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
            
            await client.db.links.create({
                invoiceID: 'null',
                state,
                count,
                type: productType,
                channel_id: interaction.channel.id,
                bot_token: client.token,
                user_bought: interaction.user.id,
                create_inf: {
                    owner_id: client.config.owners[0],
                    bot_id: client.user.id,
                    time: client.functions.time()
                }
            });
            
            try {
                const hour = parseInt(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit" }));
                await user.send(`😊 ・ Olá, <@!${user.id}>, **${hour >= 6 && hour < 12 ? "bom dia" : hour >= 12 && hour < 18 ? "boa tarde" : "boa noite"}**! Aqui está o link que você ganhou de **${interaction.user.username}** para **impulsionar o seu servidor**!\n➡️ ${link}`);
            } catch (e) {
                return interaction.editReply(`:x: <@!${interaction.user.id}> Não foi possível enviar o link para o usuário. Verifique se o ID está correto e se o usuário está com as mensagens diretas ativas.`);
            }
            
            return interaction.editReply(`:white_check_mark: <@!${interaction.user.id}> O link foi enviado com sucesso para **\`${user.username}\`**!`);
            
        } catch (error) {
            console.error(error);
            return interaction.editReply({
                content: `:x: Ocorreu um erro inesperado ao executar o comando. Por favor, tente novamente mais tarde.`,
                flags: ["Ephemeral"]
            });
        }
    }
};
