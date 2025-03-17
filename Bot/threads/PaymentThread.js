'use strict';

const { setTimeout: sleep } = require('node:timers/promises');
const { Payment } = require('mercadopago');
const { EmbedBuilder } = require('discord.js');

module.exports = async function(client) {
    while (true) {
        const payments = await client.db.payments.find({}).catch(() => null);
        
        if (!payments) {
            console.error('[Logs] Error during get payments data.');
            await sleep(7000);
            continue;
        }

        const PaymentService = new Payment(client.mp);

        for (const payment of payments) {
            const channel = await client.channels.fetch(payment.channelId).catch(() => {});
            const user = await client.users.fetch(payment.author).catch(() => {});
            const data = await PaymentService.get({ id: payment.id }).catch(() => {});
            
            if (!channel || !user || !data?.id) {
                await client.db.payments.deleteOne({ id: payment.id });
                continue;
            }
            if (data.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name === 'Banco Inter S.A.') {
                await channel.send(
                    `**    **:x: <@!${user.id}> O seu pagamento foi **recusado** pois ele é proveniente do **Banco Inter S.A.**. O dinheiro será devolvido para a sua conta em até **3 minutos**.`
                ).catch(() => {});

                await sleep(5000);
                
                let refundStatus = null;
                
                for (let attempt = 0; attempt < 2; attempt++) {
                    if (attempt === 1) {
                        await channel.send(
                            `**    **:hourglass: <@!${user.id}> A primeira tentativa de reembolso falhou. Tentaremos novamente em **10 segundos**...`
                        ).catch(() => {});
                        
                        await sleep(10000);
                    }

                    refundStatus = await client.axios.post(
                        `https://api.mercadopago.com/v1/payments/${data.id}/refunds`, 
                        { amount: data.transaction_amount },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${client.config.mercadopago_token}`,
                                'X-Idempotency-Key': require('node:crypto').randomUUID()
                            }
                        }
                    )
                    .then((e) => e.status)
                    .catch((e) => e.response ? e.response.status : null);
                  
                    if (refundStatus >= 200 && refundStatus < 300) break;
                }

                await client.db.payments.deleteOne({ id: payment.id });
              
                if (refundStatus < 200 || refundStatus >= 300) {
                    channel.send(
                        `**    **:x: <@!${user.id}> Não foi possível realizar o reembolso para a sua conta! Por motivos de segurança, este canal não será deletado.\n\n**ID do Pagamento: \` ${data.id} \`\nCódigo de Status: ${refundStatus}\nPreço final: R$${data.transaction_amount.toFixed(2)}**\n\n**    **:warning: Contate algum **admnistrador** para que ele possa realizar o seu reembolso!`
                    );
                    continue;
                }

                await channel.send(
                    `**    **:white_check_mark: <@!${user.id}> O seu reembolso no valor de **R$${data.transaction_amount.toFixed(2)}** foi **realizado com sucesso**! Este canal será deletado em **3 minutos**.`
                ).catch(() => {});

                setTimeout(() => channel.delete().catch(() => {}), 1000 * 60 * 3);
                continue;
            }
            
            switch (data.status) {
                case 'approved': {
                const state = await client.functions.state(client);
                const logChannel = await client.channels.fetch(client.config.channel_log_id).catch(() => {});
                if (logChannel) {
                  const embed = new EmbedBuilder()
                    .setColor('#008000')
                    .setTitle('✅ Pagamento Aprovado')
                    .addFields(
                        { name: '👤 Informações do Comprador', value: `**Marc:** <@${user.id}>\n**Nome:** ${user.username}\n**ID:** ${user.id}` },
                        { name: '📦 Informações do Pedido', value: `**ID:** ${data.id}\n**Produto:** 2 Impulsos ${payment.type === '1m' ? 'mensal' : payment.type === '3m' ? 'trimestral' : 'N/A'}\n**Quantidade:** ${payment.amount}\n**Valor:** R$${data.transaction_amount?.toFixed(2) || 'N/A'}\n**Horário:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` },
                        { name: '💳 Informações do Pagamento', value: `**Método:** ${data.payment_method_id}\n**Instituição:** ${data.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name || 'N/A'}\n**Conta:** ${data.point_of_interaction?.transaction_data?.bank_info?.account_id || 'N/A'}` },
                        { name: '📤 Informações da Entrega', value: `\`\`\` Olá, <@!${user.id}>, aqui está o link para os seus ${payment.amount * 2} impulsos:\nhttps://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/doboosts&response_type=code&scope=identify%20bot&permissions=1&state=${state} \`\`\`` }
                    )
                    .setTimestamp()
                    .setFooter({
                    text: 'Vendas rápidas, seguras e confiáveis!'
                });
                
                await logChannel.send({ content: `<@!${user.id}>`, embeds: [embed] }).catch(() => {});
                }
                    await channel.send(`**    **:white_check_mark: <@!${user.id}> O pagamento foi **aprovado**! Irei enviar o link dos impulsos no seu privado.`)
                        .catch(() => {});
                    
                        const guild = await client.guilds.fetch(client.config.guildId).catch(() => {});
                        if (guild) {
                            const member = await guild.members.fetch(user.id).catch(() => {});
                            if (member) {
                                const role = guild.roles.cache.get(client.config.role_id);
                                if (role && !member.roles.cache.has(role.id)) {
                                    await member.roles.add(role).catch(() => {});
                                    await channel.send(`**    **🎉 <@!${user.id}>, você recebeu o cargo <@&${role.id}>!`).catch(() => {});
                                }
                            }
                        }
                    
                    await client.db.links.create({
                        invoiceID: 'null',
                        count: payment.amount,
                        state,
                        type: payment.type,
                        channel_id: channel.id,
                        bot_token: client.token,
                        user_bought: user.id,
                        create_inf: {
                            owner_id: client.config.owners[0],
                            bot_id: client.user.id,
                            time: client.functions.time()
                        }
                    });
                    
                    const tokens = await client.db.tokens.find({ type: payment.type, limitServer: false });
                    
                    const link = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/doboosts&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
                    const hour = parseInt(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit" }));
                  
                    await user.send(`**    **😊  ・  Olá, <@!${user.id}>, **${hour >= 6 && hour < 12 ? "bom dia" : hour >= 12 && hour < 18 ? "boa tarde" : "boa noite"}**! Aqui abaixo está o link para os seus **${payment.amount * 2} impulsos**! **Agradecemos a preferência e a confiança em nossos serviços!\n    :arrow_right: ${link}**`)
                        .catch(() => {});
                    await channel.send('**    **🗑  ・  O canal será apagado em **1 minuto**...')
                        .catch(() => {});
                    await client.db.payments.deleteOne({ id: payment.id });
                    
                    setTimeout(() => channel.delete(), 1000 * 60);
                break; }
                case 'cancelled': {
                    channel.send(`**    **:x: <@!${user.id}> O pagamento foi cancelado. O canal será **deletado** em **3 minutos**.`)
                        .catch(() => {});
                    await client.db.payments.deleteOne({ id: payment.id });
                    
                    setTimeout(() => channel.delete().catch(() => {}), 1000 * 60 * 3);
                break; }
            }
            
            await sleep(1000);
        }

        await sleep(7000);
    }
};