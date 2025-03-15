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
            name: 'tipo1',
            description: 'Selecione o tipo principal (impulsos ou membros).',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Impulsos', value: 'impulsos' },
                { name: 'Membros', value: 'membros' }
            ],
            required: true
        },
        {
            name: 'tipo2',
            description: 'Selecione a opção correspondente. (1m, 3m, offline)',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: '1m', value: '1m' },
                { name: '3m', value: '3m' },
                { name: 'Offline', value: 'members' }
            ],
            required: true
        },
        {
            name: 'quantidade',
            description: 'Insira a quantidade.',
            type: ApplicationCommandOptionType.Number,
            required: true
        }
    ],
    async run(client, interaction) {
        try {
            if (interaction.replied || interaction.deferred) {
                return;
            }
    
            if (!client.config.owners.includes(interaction.user.id)) {
                return interaction.reply({
                    content: `:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
                    ephemeral: true
                });
            }
    
            const userId = interaction.options.getString('user_id');
            const tipo1 = interaction.options.getString('tipo1');
            const tipo2 = interaction.options.getString('tipo2');
            const quantidade = interaction.options.getNumber('quantidade');
    
            let user = await client.users.fetch(userId).catch(() => null);
            if (!user?.id) {
                return interaction.reply({
                    content: `:x: <@!${interaction.user.id}> Não consegui buscar o usuário com o identificador fornecido.`,
                    ephemeral: true
                });
            }
    
            // Processo
            if (tipo1 === 'impulsos') {
                if (!['1m', '3m'].includes(tipo2)) {
                    return interaction.reply({
                        content: `:x: Opção inválida para impulsos. Escolha entre '1m' ou '3m'.`,
                        ephemeral: true
                    });
                }
    
                const estoque = await client.db.tokens.find({ limitServer: false, type: tipo2 });
                if (quantidade > estoque.length) {
                    return interaction.reply({
                        content: `:x: Estoque insuficiente para \`${quantidade}\`. Apenas \`${estoque.length}\` disponíveis.`,
                        ephemeral: true
                    });
                }
            } else if (tipo1 === 'membros') {
                if (tipo2 !== 'members') {
                    return interaction.reply({
                        content: `:x: Opção inválida para membros. Escolha 'offline'.`,
                        ephemeral: true
                    });
                }
    
                const tokens = await client.db.tokens.find({ limitServer: true, nitrada: false });
                if (tokens.length === 0) {
                    return interaction.reply({
                        content: `:x: Não há tokens disponíveis para membros no momento.`,
                        ephemeral: true
                    });
                }
            }
    
            const state = await client.functions.state(client);
            await client.db.links.create({
                invoiceID: 'null',
                count: quantidade,
                state,
                type: tipo2,
                channel_id: interaction.channel.id,
                bot_token: client.token,
                user_bought: interaction.user.id,
                create_inf: {
                    owner_id: client.config.owners[0],
                    bot_id: client.user.id,
                    time: client.functions.time()
                }
            });
    
            let link;
            if (tipo1 === 'impulsos') {
                link = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/doboosts&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
            } else {
                link = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/domembers&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
            }
    
            // envio
            try {
                await user.send(`😊 ・ Olá, <@!${user.id}>! Aqui está o link de **${interaction.user.username}** para você!\n➡️ ${link}`);
            } catch (e) {
                return interaction.reply({
                    content: `:x: Não foi possível enviar o link para o usuário. Verifique se as mensagens diretas estão ativadas.`,
                    ephemeral: true
                });
            }
    
            // Log
            const logChannel = await client.channels.fetch(client.config.channel_log_id);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Novo envio de link')
                    .addFields(
                        { name: 'Quem enviou', value: `<@!${interaction.user.id}>`, inline: true },
                        { name: 'Para quem foi enviado', value: `<@!${user.id}>`, inline: true },
                        { name: 'Tipo 1', value: tipo1, inline: true },
                        { name: 'Tipo 2', value: tipo2, inline: true },
                        { name: 'Quantidade', value: `${quantidade}`, inline: true },
                        { name: 'State', value: state, inline: true },
                        { name: 'Mensagem enviada', value: `\`\`\` 😊 ・ Olá, <@!${user.id}>! Aqui está o link de **${interaction.user.username}** para você!\n➡️ ${link} \`\`\`` }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Comando executado por ${interaction.user.username}` });
    
                logChannel.send({ embeds: [embed] });
            }
    
            return interaction.reply({
                content: `:white_check_mark: <@!${interaction.user.id}> O link foi enviado com sucesso para **\`${user.username}\`**!`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: `:x: Ocorreu um erro inesperado ao executar o comando. Por favor, tente novamente mais tarde.`,
                    ephemeral: true
                });
            }
        }
    }     
};
