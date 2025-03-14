'use strict';

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Função sleep personalizada
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function (client) {
    let lastTokens = [];

    while (true) {
        try {
            // Buscar painéis apenas uma vez
            const panels = await client.db.panels.find({}).catch(() => []);
            if (!panels.length) {
                console.error('[Logs] Nenhum painel encontrado no banco.');
                await sleep(7000);
                continue;
            }

            const tokens = await client.db.tokens.find({ limitServer: false }).catch(() => []);
            if (JSON.stringify(tokens) === JSON.stringify(lastTokens)) {
                await sleep(7000);
                continue;
            }

            const members = await client.db.tokens.find({ limitServer: true }).catch(() => []);
            if (JSON.stringify(tokens) === JSON.stringify(lastTokens)) {
                await sleep(7000);
                continue;
            }
            lastTokens = tokens;

            const stock = {
                oneMonthTokens: tokens.filter(s => s.type === '1m').length,
                threeMonthsTokens: tokens.filter(s => s.type === '3m').length,
                membrosTokens: members.filter(s => !s.nitrada && !s.badtoken).length
            };            

            for (const panel of panels) {
                try {
                    // Verifica se o customId existe
                    if (!panel.customId) {
                        console.error(`[Logs] O customId não foi encontrado para o painel ${panel.channelId}. Deletando painel.`);
                        await client.db.panels.deleteOne({ _id: panel._id });
                        continue;
                    }

                    // Buscar a mensagem na cache primeiro para evitar chamadas à API
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
                    const tipo = panel.type; // Tipo do painel

                    if (tipo === 'impulsos') {
                        selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(panel.customId)
                            .setPlaceholder('Selecione um Impulso')
                            .addOptions(
                                {
                                    label: `2 Impulsos Mensais`,
                                    description: `Valor: R$${client.config.price_1m.toFixed(2)} | Estoque: ${stock.oneMonthTokens}`,
                                    value: '1m'
                                },
                                {
                                    label: `2 Impulsos Trimestrais`,
                                    description: `Valor: R$${client.config.price_3m.toFixed(2)} | Estoque: ${stock.threeMonthsTokens}`,
                                    value: '3m'
                                }
                            );
                    } else if (tipo === 'nitradas') {
                        selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(panel.customId)
                            .setPlaceholder('Selecione uma Nitrada')
                            .addOptions(
                                {
                                    label: `Nitrada Mensal`,
                                    description: `Valor: R$${client.config.price_nitrada_1m.toFixed(2)} | Estoque: ${stock.oneMonthTokens}`,
                                    value: 'n1m'
                                },
                                {
                                    label: `Nitrada Trimensal`,
                                    description: `Valor: R$${client.config.price_nitrada_3m.toFixed(2)} | Estoque: ${stock.threeMonthsTokens}`,
                                    value: 'n3m'
                                }
                            );
                    } else if (tipo === 'members') {
                        selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(panel.customId)
                            .setPlaceholder('Selecione um Membro')
                            .addOptions(
                                {
                                    label: `Membros Disponíveis`,
                                    description: `Valor: R$${client.config.price_members.toFixed(2)} | Quantidade: ${stock.membrosTokens}`,
                                    value: 'members'
                                }
                            );
                    }

                    // Atualiza a mensagem com os novos componentes
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

        await sleep(7000);
    }
};
