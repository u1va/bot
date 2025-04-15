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

            if (data.status === 'approved') {
                const state = await client.functions.state(client);
                const logChannel = await client.channels.fetch(client.config.channel_log_id).catch(() => {});

                let query = null;

                switch (payment.type) {
                    case '1m':
                        query = { type: '1m', limitServer: false };
                        break;
                    case '3m':
                        query = { type: '3m', limitServer: false };
                        break;
                    case 'n1m':
                        query = { type: '1m', limitServer: false };
                        break;
                    case 'n3m':
                        query = { type: '3m', limitServer: false };
                        break;
                    case 'ons':
                        query = { limitServer: true, nitrada: true, badtoken: false };
                        break;
                    case 'offs':
                        query = { limitServer: true, nitrada: false, badtoken: false };
                        break;
                    default:
                        query = null;
                }

                let token = null;
                if (query) {
                    token = await client.db.tokens.findOne(query);
                }

                if (!token) {
                    await channel.send(`**    **:x: <@!${user.id}> Sem estoque disponível. Iniciando reembolso...`);

                    const refundStatus = await client.axios.post(
                        `https://api.mercadopago.com/v1/payments/${data.id}/refunds`,
                        { amount: data.transaction_amount },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${client.config.mercadopago_token}`,
                                'X-Idempotency-Key': require('node:crypto').randomUUID()
                            }
                        }
                    ).then(e => e.status).catch(e => e.response?.status);

                    if (refundStatus >= 200 && refundStatus < 300) {
                        await channel.send(`**    **:white_check_mark: <@!${user.id}> Reembolso realizado! O canal será deletado em 3 minutos.`);
                        setTimeout(() => channel.delete().catch(() => {}), 1000 * 60 * 3);
                    } else {
                        await channel.send(`**    **:x: <@!${user.id}> Erro no reembolso. Contate um administrador.`);
                    }
                    continue;
                }

                let product = '';

                if (payment.type === '1m' || payment.type === '3m') {
                    product = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/doboosts&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
                    await client.db.links.create({
                        invoiceID: 'null',
                        state,
                        count: payment.amount,
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

                    await user.send(`**    **😊 ・ Olá! Seu pedido foi processado com sucesso. Aqui está a entrega do seu pedido:\n${product}`)
                        .catch(() => channel.send(`**    **:warning: <@!${user.id}> Ative suas DMs para receber o link.`));
                }

                else if (payment.type === 'ons' || payment.type === 'offs') {
                    product = `https://discord.com/api/oauth2/authorize?client_id=${client.config.main_client_id}&redirect_uri=${encodeURIComponent(client.config.redirectURL)}/domembers&response_type=code&scope=identify%20bot&permissions=1&state=${state}`;
                    await client.db.links.create({
                        invoiceID: 'null',
                        state,
                        count: payment.amount,
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

                    await user.send(`**    **😊 ・ Olá! Seu pedido foi processado com sucesso. Aqui está a entrega do seu pedido:\n${product}`)
                        .catch(() => channel.send(`**    **:warning: <@!${user.id}> Ative suas DMs para receber o link.`));
                }

                else if (payment.type === 'n1m' || payment.type === 'n3m') {
                    const quantity = payment.amount;
                    const tokenDocs = await client.db.tokens.find(query).limit(quantity).toArray();
                
                    const tokens = tokenDocs.map(tokenData => {
                        return tokenData.email && tokenData.password
                            ? `${tokenData.email}:${tokenData.password}:${tokenData.token}`
                            : `${tokenData.token}`;
                    });
                
                    while (tokens.length < quantity) {
                        tokens.push('Nitradas não disponível');
                    }
                    
                    const fileBuffer = Buffer.from(tokens.join('\n'), 'utf-8');
                    const fileName = `nitradas_${payment.id}.txt`;
                    const fileAttachment = { attachment: fileBuffer, name: fileName };

                    await user.send({
                        content: `**    **😊 ・ Olá! Seu pedido foi processado com sucesso. Aqui está a entrega do seu pedido:`,
                        files: [fileAttachment]
                    }).catch(() => {
                        channel.send(`**    **:warning: <@!${user.id}> Ative suas DMs para receber o arquivo de tokens.`);
                    });

                    const bottomdm = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                        .setLabel('Dirija-se ao privado')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.com/channels/1288085297858478122/1289790383886434401')
                );
                    
                    await channel.send({
                        content: `**    **:white_check_mark: <@!${user.id}> Pagamento aprovado! A entrega do seu pedido vai ser efetuada no seu privado.`,
                        components: [bottomdm]
                    });
                    await client.db.payments.deleteOne({ id: payment.id });
                    setTimeout(() => channel.delete().catch(() => {}), 1000 * 60);
                }

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#008000')
                        .setTitle('✅ Pagamento Aprovado')
                        .addFields(
                            { name: '👤 Informações do Comprador', value: `**Marc:** <@${user.id}>\n**Nome:** ${user.username}\n**ID:** ${user.id}` },
                            { name: '📦 Informações do Pedido', value: `**ID:** ${data.id}\n**Produto:** 2 Impulsos ${payment.type === '1m' ? 'mensal' : payment.type === '3m' ? 'trimestral' : payment.type}\n**Quantidade:** ${payment.amount}\n**Valor:** R$${data.transaction_amount?.toFixed(2) || 'N/A'}\n**Horário:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` },
                            { name: '💳 Informações do Pagamento', value: `**Método:** ${data.payment_method_id}\n**Instituição:** ${data.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name || 'N/A'}\n**Conta:** ${data.point_of_interaction?.transaction_data?.bank_info?.account_id || 'N/A'}` },
                            { name: '📤 Informações da Entrega', value: `\`\`\`${product}\`\`\`` }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] });
                }

                await channel.send(`**    **:white_check_mark: <@!${user.id}> Pagamento aprovado! Verifique seu privado.`);
                await client.db.payments.deleteOne({ id: payment.id });
                setTimeout(() => channel.delete().catch(() => {}), 1000 * 60);
            }


            if (data.status === 'cancelled') {
                await channel.send(`**    **:x: <@!${user.id}> O pagamento foi cancelado. O canal será **deletado** em **3 minutos**.`);
                await client.db.payments.deleteOne({ id: payment.id });
                setTimeout(() => channel.delete().catch(() => {}), 1000 * 60 * 3);
            }

            await sleep(1000);
        }

        await sleep(7000);
    }
};