const {
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  InteractionType,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Events,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle
} = require('discord.js');
const Payment = require('mercadopago');

module.exports = function (client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isModalSubmit() && interaction.customId === 'edit_quantity_modal') {
        const newQuantity = parseInt(interaction.fields.getTextInputValue('quantity_input'));
        if (!interaction.message || !interaction.channel) return;

        const currentEmbed = interaction.message.embeds?.[0];
        if (!currentEmbed) return interaction.reply({ content: ':x: Embed não encontrado.', ephemeral: true });

        const channelType = interaction.channel.name.split('-').pop();
        const productData = await getProductData(channelType, client);
        if (!productData) return interaction.reply({ content: ':x: Produto inválido.', ephemeral: true });

        const stock = productData.stock;

        if (isNaN(newQuantity) || newQuantity < 1 || newQuantity > stock) {
          return interaction.reply({ content: ':x: Quantidade inválida ou maior que o estoque disponível.', ephemeral: true });
        }

        const updatedEmbed = EmbedBuilder.from(currentEmbed)
          .spliceFields(0, 4)
          .addFields(
            { name: 'Produto', value: `\`${productData.name}\``, inline: true },
            { name: 'Estoque Disponível', value: `\`${stock}x\``, inline: true },
            { name: 'Quantidade', value: `\`${newQuantity}x\``, inline: true },
            { name: 'Valor Total', value: `\`R$${(productData.price * newQuantity).toFixed(2)}\``, inline: true }
          );

        await interaction.message.edit({ embeds: [updatedEmbed] });

        interaction.channel.currentQuantity = newQuantity;

        return interaction.reply({ content: `✅ Quantidade atualizada para ${newQuantity}`, ephemeral: true });
      }

      if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('panel_')) return;

      const [_, interactionId, channelId] = interaction.customId.split('_');
      if (interaction.channel.id !== channelId) return;

      const existingChannel = await client.db.channels.findOne({ userId: interaction.user.id });
      if (existingChannel && interaction.guild?.channels.cache.has(existingChannel.channelId)) {
        return interaction.reply({
          content: ':x: Você já possui um canal ativo. Finalize ou cancele o carrinho existente antes de criar outro.',
          ephemeral: true
        });
      } else if (existingChannel) {
        await client.db.channels.deleteOne({ userId: interaction.user.id });
      }

      const selectedType = interaction.values[0];
      const productData = await getProductData(selectedType, client);
      if (!productData) return interaction.reply({ content: ':x: Produto inválido.', ephemeral: true });

      const stock = productData.stock;
      if (stock <= 0) return interaction.reply({ content: ':x: Estoque insuficiente para o produto selecionado.', ephemeral: true });

      const cartEmbed = new EmbedBuilder()
        .setTitle('🛒 | Carrinho de Impulsos')
        .setDescription(`📦 Produto: **${productData.name}**\n⏱️ Você tem 15 minutos para editar.`)
        .addFields(
          { name: 'Produto', value: `\`${productData.name}\``, inline: true },
          { name: 'Estoque Disponível', value: `\`${stock}x\``, inline: true },
          { name: 'Quantidade', value: '\`1x\`', inline: true },
          { name: 'Valor Total', value: `\`R$${productData.price.toFixed(2)}\``, inline: true }
        )
        .setColor('#2a2d30');

      await interaction.deferReply({ ephemeral: true });

      const cartChannel = await interaction.guild.channels.create({
        name: `🛒・${interaction.user.username}-${selectedType}`,
        type: 0,
        topic: `${selectedType}-${interaction.user.id}`,
        parent: client.config.category_id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }
        ]
      });

      await client.db.channels.create({ userId: interaction.user.id, channelId: cartChannel.id });

      const cartMessage = await cartChannel.send({ content: `<@!${interaction.user.id}>`, embeds: [cartEmbed] });

      const cartButtonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_cart').setLabel('Confirmar pedido').setEmoji('✅').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('edit_cart').setLabel('Editar quantidade').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cancel_cart').setLabel('Cancelar carrinho').setEmoji('❌').setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ content: `✅ Carrinho criado com sucesso: <#${cartChannel.id}>` });
      await cartMessage.edit({ components: [cartButtonsRow] });

      let currentQuantity = 1;
      cartChannel.currentQuantity = currentQuantity;

      const collector = cartChannel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 900000
      });

      collector.on('collect', async (btnInt) => {
        try {
          if (btnInt.replied || btnInt.deferred) return;

          const product = productData.name;
          const price = productData.price;

          currentQuantity = cartChannel.currentQuantity ?? currentQuantity;

          if (btnInt.customId === 'cancel_cart') {
            await client.db.channels.deleteOne({ userId: interaction.user.id });
            return cartChannel.delete();
          }

          if (btnInt.customId === 'edit_cart') {
            const modal = new ModalBuilder().setCustomId('edit_quantity_modal').setTitle('Editar Quantidade')
              .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('quantity_input')
                  .setLabel('Digite a nova quantidade')
                  .setStyle(TextInputStyle.Short)
                  .setValue(currentQuantity.toString())
                  .setMinLength(1).setMaxLength(2).setRequired(true)
              ));
            return btnInt.showModal(modal);
          }

          if (btnInt.customId === 'confirm_cart') {
            const confirmationEmbed = new EmbedBuilder()
              .setTitle('💳 - Confirmação de Pedido')
              .setDescription(`Produto: \`${product}\`\nQuantidade: \`${currentQuantity}x\`\nValor Total: \`R$${(price * currentQuantity).toFixed(2)}\`\n\n**:warning: Atenção:** Não aceitamos transações realizadas pelo **Banco Inter S.A.**.`)
              .setColor('#2a2d30');

            const confirmButtons = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('proceed_payment').setLabel('Ir para pagamento').setEmoji('💸').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('return_to_edit').setLabel('Voltar').setEmoji('✏️').setStyle(ButtonStyle.Secondary)
            );

            await cartMessage.edit({ embeds: [confirmationEmbed], components: [confirmButtons] });
            return btnInt.deferUpdate();
          }

          if (btnInt.customId === 'return_to_edit') {
            await cartMessage.edit({ components: [cartButtonsRow] });
            return btnInt.deferUpdate();
          }

          if (btnInt.customId === 'proceed_payment') {
            try {
              await btnInt.deferUpdate();

              const paymentEmbed = new EmbedBuilder()
                .setTitle('🔗 - Link de Pagamento')
                .setDescription(
                  `Seu pedido foi processado!\n\n**Produto:**${product}\n**Quantidade:** ${currentQuantity}x\n**Valor Total:** R$${(price * currentQuantity).toFixed(2)}\n\n🔒 Pagamento protegido. Você tem **10 minutos**.`
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
                new ButtonBuilder().setLabel('Site Mercado Pago').setEmoji('💸').setURL(payment.point_of_interaction.transaction_data.ticket_url).setStyle(ButtonStyle.Link),
                new ButtonBuilder().setLabel('Cancelar').setEmoji('<:est_npostarei:1326320024570298460>').setCustomId('cancel_cart').setStyle(ButtonStyle.Primary)
              );

              await cartMessage.edit({ embeds: [paymentEmbed], components: [paymentButtons] });

              await client.db.payments.create({
                id: payment.id,
                author: btnInt.user.id,
                channelId: btnInt.channel.id,
                type: selectedType,
                amount: currentQuantity,
                price: price * currentQuantity
              });

            } catch (err) {
              console.error('Erro no botão de pagamento:', err);
              if (!btnInt.replied && !btnInt.deferred) {
                await btnInt.reply({ content: ':x: Ocorreu um erro ao processar.', ephemeral: true });
              }
            }
          }

        } catch (err) {
          console.error('Erro geral no coletor:', err);
          if (!btnInt.replied && !btnInt.deferred) {
            await btnInt.reply({ content: '❌ Ocorreu um erro ao processar sua ação.', ephemeral: true });
          }
        }
      });
    } catch (err) {
      console.error('Erro fora do coletor:', err);
    }
  });
};

async function getProductData(type, client) {
    const mapping = {
      '1m': { name: '2 Impulsos Mensal', price: client.config.price_1m, stockQuery: { type: '1m', limitServer: false } },
      '3m': { name: '2 Impulsos Trimensal', price: client.config.price_3m, stockQuery: { type: '3m', limitServer: false } },
      'n1m': { name: 'Nitrada Mensal', price: client.config.price_n1m, stockQuery: { type: '1m', limitServer: false } },
      'n3m': { name: 'Nitrada Trimensal', price: client.config.price_n3m, stockQuery: { type: '3m', limitServer: false } },
      'ons': { name: 'Membros Online', price: client.config.price_members_ons, stockQuery: { nitrada: true, limitServer: true, badtoken: false } },
      'offs': { name: 'Membros Offline', price: client.config.price_members_offs, stockQuery: { nitrada: false, limitServer: true, badtoken: false } }
    };
  
    const product = mapping[type];
  
    if (!product) return null;
  
    try {
      const stockCount = await client.db.tokens.countDocuments(product.stockQuery);
      return {
        name: product.name,
        price: product.price,
        stock: stockCount
      };
    } catch (error) {
      console.error('[getProductData Error]', error);
      return null;
    }
  }
  