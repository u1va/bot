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
            const badtokens = await client.db.tokens.find({ limitServer: true, badtoken: false }).catch(() => []);
            const stock = {
                oneMonthTokens: tokens.filter(s => s.type === '1m').length,
                threeMonthsTokens: tokens.filter(s => s.type === '3m').length,
                onlineMembers: badtokens.filter(token => token.nitrada === true).length,
                offlineMembers: badtokens.filter(token => token.nitrada === false).length
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

                    let selectMenu;
                    
                    if (panel.type === 'boosts') {
                        selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(panel.customId)
                            .setPlaceholder('Selecione um produto')
                            .addOptions(
                                {
                                    label: '2 Impulsos Mensal',
                                    description: `Valor: R$${client.config.price_1m.toFixed(2)} | Estoque: ${stock.oneMonthTokens}`,
                                    value: '1m'
                                },
                                {
                                    label: '2 Impulsos Trimensal',
                                    description: `Valor: R$${client.config.price_3m.toFixed(2)} | Estoque: ${stock.threeMonthsTokens}`,
                                    value: '3m'
                                }
                            );
                    } else if (panel.type === 'members') {
                        selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(panel.customId)
                            .setPlaceholder('Selecione um produto')
                            .addOptions(
                                {
                                    label: 'Membros Online',
                                    description: `Valor: R$${client.config.price_members_ons.toFixed(2)} | Estoque: ${stock.onlineMembers}`,
                                    value: 'ons'
                                },
                                {
                                    label: 'Membros Offline',
                                    description: `Valor: R$${client.config.price_members_offs.toFixed(2)} | Estoque: ${stock.offlineMembers}`,
                                    value: 'offs'
                                }
                            );
                    } else if (panel.type === 'tokens') {
                        selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(panel.customId)
                            .setPlaceholder('Selecione um produto')
                            .addOptions(
                                {
                                    label: 'Nitrada Mensal',
                                    description: `Valor: R$${client.config.price_n1m.toFixed(2)} | Estoque: ${stock.oneMonthTokens}`,
                                    value: 'n1m'
                                },
                                {
                                    label: 'Nitrada Trimensal',
                                    description: `Valor: R$${client.config.price_n3m.toFixed(2)} | Estoque: ${stock.threeMonthsTokens}`,
                                    value: 'n3m'
                                }
                            );
                    }

                    if (selectMenu) {
                        await message.edit({ 
                            components: [
                                new ActionRowBuilder().addComponents(selectMenu)
                            ] 
                        }).catch(error => {
                            console.error('[Logs] Erro ao atualizar painel com novos componentes:', error);
                        });
                    }

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