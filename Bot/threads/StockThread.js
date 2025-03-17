'use strict';

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function (client) {
    let lastTokens = [];

    while (true) {
        try {
            const panels = await client.db.panels.find({}).catch(() => []);
            if (!panels.length) {
                await sleep(10000);
                continue;
            }

            const tokens = await client.db.tokens.find({ limitServer: false }).catch(() => []);
            if (JSON.stringify(tokens) === JSON.stringify(lastTokens)) {
                await sleep(10000);
                continue;
            }
            lastTokens = tokens;

            const stock = {
                oneMonthTokens: tokens.filter(s => s.type === '1m').length,
                threeMonthsTokens: tokens.filter(s => s.type === '3m').length
            };

            for (const panel of panels) {
                try {
                    if (!panel.customId) {
                        console.error(`[Logs] O customId não foi encontrado para o painel ${panel.channelId}. Deletando painel.`);
                        await client.db.panels.deleteOne({ _id: panel._id });
                        continue;
                    }

                    const channel = client.channels.cache.get(panel.channelId) || await client.channels.fetch(panel.channelId).catch(() => null);
                    if (!channel) {
                        console.log(`[Logs] Canal ${panel.channelId} não encontrado. Deletando painel.`);
                        await client.db.panels.deleteOne({ _id: panel._id });
                        continue;
                    }

                    const message = channel.messages.cache.get(panel.messageId) || await channel.messages.fetch(panel.messageId).catch(() => null);
                    if (!message) {
                        console.log(`[Logs] Mensagem ${panel.messageId} não encontrada. Deletando painel.`);
                        await client.db.panels.deleteOne({ _id: panel._id });
                        continue;
                    }

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(panel.customId)
                        .setPlaceholder('Selecione um Produto')
                        .addOptions(
                            {
                                label: `2 Impulsos Mensal`,
                                description: `Valor: R$${client.config.price_1m.toFixed(2)} | Estoque: ${stock.oneMonthTokens}`,
                                value: '1m'
                            },
                            {
                                label: `2 Impulsos Trimensal`,
                                description: `Valor: R$${client.config.price_3m.toFixed(2)} | Estoque: ${stock.threeMonthsTokens}`,
                                value: '3m'
                            }
                        );

                    await message.edit({ 
                        components: [
                            new ActionRowBuilder().addComponents(selectMenu)
                        ] 
                    }).catch(error => {
                        console.error('[Logs] Erro ao atualizar painel com novos componentes:', error);
                    });

                } catch (error) {
                    console.error(`[Logs] Erro ao atualizar painel ${panel.channelId}:`, error);
                }
            }
        } catch (error) {
            console.error('[Logs] Erro no loop de atualização dos painéis:', error);
        }

        await sleep(10000);
    }
};
