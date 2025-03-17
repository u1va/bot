'use strict';

const {
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    InteractionType,
    ButtonBuilder,
    EmbedBuilder,
    ButtonStyle,
    Events
} = require('discord.js');
const { Payment } = require('mercadopago');

module.exports = function(client) {
    client.on(Events.InteractionCreate, async function(menuInteraction) {
        if (menuInteraction.type !== InteractionType.MessageComponent) return;
        
        const [ custom, interactionId, channelId ] = menuInteraction.customId.split('_');
        
        if (menuInteraction.channel.id !== channelId || custom !== 'panel') return;
        await menuInteraction.deferReply({ ephemeral: true });
        const existingChannel = await client.db.channels.findOne({ userId: menuInteraction.user.id });

if (existingChannel) {
    const guild = client.guilds.cache.get(menuInteraction.guild.id);
    const channelExists = guild?.channels.cache.has(existingChannel.channelId);

    if (!channelExists) {
        await client.db.channels.deleteOne({ userId: menuInteraction.user.id });
    } else {
        return menuInteraction.editReply({
            content: `**    **:x: <@!${menuInteraction.user.id}> Você já possui um canal ativo. Finalize ou cancele o carrinho existente antes de criar outro.`,
            ephemeral: true,
        });
    }
}
        
        const tokens = await client.db.tokens.find({ limitServer: false });
        const oneMonthTokens = tokens.filter((s) => s.type === '1m').length;
        const threeMonthsTokens = tokens.filter((s) => s.type === '3m').length;
        const selectedValue = menuInteraction.values[0];
        const product = selectedValue === '1m' ? 'Impulsos Mensal' : 'Impulsos Trimensal';
        const stock = selectedValue === '1m' ? oneMonthTokens : threeMonthsTokens;
        const price = selectedValue === '1m' ? client.config.price_1m : client.config.price_3m;

        if (stock <= 0) return menuInteraction.editReply({
            content: `**    **:x: <@!${menuInteraction.user.id}> Estoque insuficiente para o produto selecionado.`,
            ephemeral: true
        });
        
        const cartEmbed = new EmbedBuilder()
            .setTitle(`<:est_carrinae:1289824035852648502>  |  Carrinho de Impulsos`)
            .setDescription(`**   **📦  Você escolheu: **${product}**\n**    **:warning: Você tem os próximos **15 minutos** para editar.\n🔔 Compre quantos impulsos quiser :relaxed:.`)
            .addFields(
                { name: 'Produto', value: `2x ${product}`, inline: true },
                { name: 'Estoque Disponível', value: `${stock}x`, inline: true },
                { name: 'Quantidade', value: '1x', inline: true },
                { name: 'Valor Total', value: `R$${price.toFixed(2)}`, inline: true }
            )
            .setColor('#2a2d30');

        const cartChannel = await menuInteraction.guild.channels.create({
            name: `🛒・${menuInteraction.user.username}-${selectedValue}`,
            type: 0,
            topic: `${selectedValue}-${menuInteraction.user.id}`,
            parent: client.config.category_id,
            permissionOverwrites: [
                {
                    id: menuInteraction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                {
                    id: menuInteraction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                },
            ],
        });

        await menuInteraction.editReply({
            content: `**    **:white_check_mark: <@!${menuInteraction.user.id}> O canal foi criado com sucesso! Acesse: <#${cartChannel.id}>.`,
            ephemeral: true
        });
        await client.db.channels.create({
            userId: menuInteraction.user.id,
            channelId: cartChannel.id
        });

        const cartMessage = await cartChannel.send({
            content: `<@!${menuInteraction.user.id}>`,
            embeds: [cartEmbed]
        });

        const cartButtonsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_cart')
                .setLabel('Confirmar')
                .setEmoji('<:est_postarei:1326319983583694938>')
                .setStyle(ButtonStyle.Primary),
            
            new ButtonBuilder()
                .setCustomId('edit_cart')
                .setLabel('Editar')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Secondary),
            
            new ButtonBuilder()
                .setCustomId('cancel_cart')
                .setLabel('Cancelar')
                .setEmoji('<:est_npostarei:1326320024570298460>')
                .setStyle(ButtonStyle.Primary)
        );

        await cartMessage.edit({ components: [cartButtonsRow] });

        let currentQuantity = 1;
        let originalQuantity = 1;

        const cartCollector = cartChannel.createMessageComponentCollector({
            filter: (i) => i.user.id === menuInteraction.user.id,
            time: 1000 * 60 * 60 * 15,
        });

        cartCollector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'cancel_cart') {
                await client.db.channels.deleteOne({ userId: menuInteraction.user.id });
                return cartChannel.delete();
            }

            if (buttonInteraction.customId === 'edit_cart') {
                originalQuantity = currentQuantity;
                const quantityIncreaseMenu = new StringSelectMenuBuilder()
                    .setCustomId('quantity_increase')
                    .setPlaceholder('Aumentar Quantidade')
                    .addOptions(
                        [...Array(10).keys()].map((q) => ({
                            label: `+${q + 1}`,
                            value: `${currentQuantity + q + 1}`,
                        }))
                    );

                const quantityDecreaseMenu = currentQuantity > 1 ? new StringSelectMenuBuilder()
                    .setCustomId('quantity_decrease')
                    .setPlaceholder('Diminuir Quantidade')
                    .addOptions(
                        [...Array(currentQuantity - 1).keys()].map((q) => ({
                            label: `-${q + 1}`,
                            value: `${currentQuantity - (q + 1)}`,
                        }))
                    ) : null;

                const editButtonsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('save_changes')
                        .setLabel('Salvar')
                        .setEmoji('<:est_postarei:1326319983583694938>')
                        .setStyle(ButtonStyle.Success),
                    
                    new ButtonBuilder()
                        .setCustomId('discard_changes')
                        .setLabel('Cancelar')
                        .setEmoji('<:est_npostarei:1326320024570298460>')
                        .setStyle(ButtonStyle.Primary)
                );

                await cartMessage.edit({
                    components: [
                        new ActionRowBuilder().addComponents(quantityIncreaseMenu),
                        ...(quantityDecreaseMenu ? [ new ActionRowBuilder().addComponents(quantityDecreaseMenu) ] : []),
                        editButtonsRow,
                    ],
                });

                return buttonInteraction.deferUpdate();
            }

            if (buttonInteraction.customId === 'save_changes') {
                const updatedEmbed = EmbedBuilder.from(cartEmbed);
                
                updatedEmbed.spliceFields(0, updatedEmbed.data.fields.length);
                updatedEmbed.addFields(
                    { name: 'Produto', value: `${currentQuantity * 2}x ${product}`, inline: true },
                    { name: 'Estoque Disponível', value: `${stock}x`, inline: true },
                    { name: 'Quantidade', value: `${currentQuantity}x`, inline: true },
                    { name: 'Valor Total', value: `R$${(price * currentQuantity).toFixed(2)}`, inline: true },
                );
                
                await cartMessage.edit({
                    embeds: [updatedEmbed],
                    components: [cartButtonsRow],
                });
                return buttonInteraction.deferUpdate();
            }

            if (buttonInteraction.customId === 'discard_changes') {
                currentQuantity = originalQuantity;
                await cartMessage.edit({ components: [cartButtonsRow] });
                return buttonInteraction.deferUpdate();
            }

            if (buttonInteraction.customId.startsWith('quantity_')) {
                const newQuantity = parseInt(buttonInteraction.values[0]);
                if (newQuantity > stock) {
                    return buttonInteraction.reply({ content: `**    **:x: <@!${buttonInteraction.user.id}> O estoque atual é insuficiente.`, ephemeral: true });
                }

                currentQuantity = newQuantity;
                return buttonInteraction.deferUpdate();
            }

            if (buttonInteraction.customId === 'confirm_cart') {
                const confirmationEmbed = new EmbedBuilder()
                    .setTitle('💳 - Confirmação de Pedido')
                    .setDescription(`Produto: **${currentQuantity * 2}x ${product}**\nQuantidade: **${currentQuantity}x**\nValor Total: **R$${(price * currentQuantity).toFixed(2)}**\n\n**    :warning: Atenção:** Não aceitamos transações realizadas pelo **Banco Inter S.A.**. Caso uma transferência proveniente desse banco seja detectada, **o valor será devolvido** para sua conta bancária.`)
                    .setColor('#2a2d30');

                const confirmButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('proceed_payment')
                        .setLabel('Ir para pagamento')
                        .setEmoji('💸')
                        .setStyle(ButtonStyle.Success),
                    
                    new ButtonBuilder()
                        .setCustomId('return_to_edit')
                        .setLabel('Editar')
                        .setEmoji('✏️')
                        .setStyle(ButtonStyle.Secondary)
                );

                await cartMessage.edit({ embeds: [confirmationEmbed], components: [confirmButtons] });
                return buttonInteraction.deferUpdate();
            }

            if (buttonInteraction.customId === 'return_to_edit') {
                await cartMessage.edit({ components: [cartButtonsRow] });
                return buttonInteraction.deferUpdate();
            }
            
if (buttonInteraction.customId === 'proceed_payment') {
    try {
        await buttonInteraction.deferUpdate();

        const paymentEmbed = new EmbedBuilder()
            .setTitle('🔗 - Link de Pagamento')
            .setDescription(
                `Seu pedido foi processado! Use o botão abaixo para realizar o pagamento:\n\n` +
                `**Produto:** ${currentQuantity * 2}x ${product}\n` +
                `**Quantidade:** ${currentQuantity}x\n` +
                `**Valor Total:** R$${(price * currentQuantity).toFixed(2)}\n\n` +
                '🔒 Seu pagamento é protegido por nossa plataforma.\n' +
                ':warning: Você terá os próximos **10 minutos** para efetuar o pagamento.'
            )
            .setColor('#2a2d30');

        const body = {
            transaction_amount: price * currentQuantity,
            description: product,
            payment_method_id: 'pix',
            payer: { email: 'example@gmail.com' },
            date_of_expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString()
        };
      
        const PAYMENT = new Payment(client.mp);
        const payment = await PAYMENT.create({ body });

        const paymentButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Pagar agora')
                .setEmoji('💸')
                .setURL(payment.point_of_interaction.transaction_data.ticket_url)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Cancelar')
                .setEmoji('<:est_npostarei:1326320024570298460>')
                .setCustomId('cancel_cart')
                .setStyle(ButtonStyle.Primary)
        );

        await cartMessage.edit({
            embeds: [paymentEmbed],
            components: [paymentButtons],
        });

        await client.db.payments.create({
            id: payment.id,
            author: buttonInteraction.user.id,
            channelId: buttonInteraction.channel.id,
            type: selectedValue,
            amount: currentQuantity,
            price: price * currentQuantity
        });
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        await buttonInteraction.reply({
            content: `**    **:x: <@!${buttonInteraction.user.id}> Ocorreu um erro ao gerar o link de pagamento. Por favor, tente novamente.`,
            ephemeral: true,
        });
    }
}
});
});
};