const { ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'live',
    description: 'Veja informações em tempo real sobre o estoque.',
    type: ApplicationCommandType.ChatInput,
    async run(client, interaction) {
        if (!client.config.owners.includes(interaction.user.id)) {
            return interaction.reply({
                content: `:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
                flags: ["Ephemeral"]
            });
        }

        const { live_stock_channel: channelId } = client.config;

        if (!channelId) {
            console.error('[Logs] [liveStockInfo] O ID do canal não foi configurado.');
            return;
        }

        const channel = await client.channels.fetch(channelId).catch(() => null);

        if (!channel) {
            console.error('[Logs] [liveStockInfo] O ID do canal especificado é inválido ou não é um canal de texto.');
            return interaction.reply({
                content: `:x: O canal configurado é inválido ou não foi encontrado. Verifique as configurações.`,
                flags: ["Ephemeral"]
            });
        }

        const embed = ({ oneMonthTokens, threeMonthsTokens }) => new EmbedBuilder()
            .setTitle('📊 Estoque Ao Vivo')
            .setDescription(
                '**📦  Confira abaixo os detalhes do estoque de tokens em tempo real!**\n\n' +
                '**  **🔄  Atualizado automaticamente a cada minuto.\n' +
                '**  **🛠️  Garantimos total qualidade e segurança.\n' +
                '**  **💬  Dúvidas? Entre em contato com nosso suporte.'
            )
            .addFields(
                { 
                    name: '✨  ・  **Contas Nitradas (1 Mês)**', 
                    value: `💎 Tokens disponíveis: **\` ${oneMonthTokens} \`**\n📅 Ideal para testes e experiências rápidas.`,
                    inline: false 
                },
                { 
                    name: '🌟  ・  **Contas Nitradas (3 Meses)**', 
                    value: `🌌 Tokens disponíveis: **\` ${threeMonthsTokens} \`**\n🕒 Perfeito para uso contínuo e prolongado.`,
                    inline: false 
                },
                { 
                    name: '📌  ・  **Informações Adicionais**', 
                    value: '>>> 🔔   Estoque sujeito à disponibilidade.\n📢   Garanta o seu antes que acabe!',
                    inline: false 
                }
            )
            .setColor('#2a2d30')
            .setFooter({
                text: 'Vendas rápidas, seguras e confiáveis!',
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        const getTokens = async () => {
            try {
                const tokens = await client.db.tokens.find({ limitServer: false });
                return {
                    oneMonthTokens: tokens.filter(s => s.type === '1m').length,
                    threeMonthsTokens: tokens.filter(s => s.type === '3m').length
                };
            } catch (error) {
                console.error('[Logs] [liveStockInfo] Erro ao buscar tokens:', error);
                return { oneMonthTokens: 0, threeMonthsTokens: 0 };
            }
        };

        let message;
        const interval = setInterval(async () => {
            const liveEmbed = embed(await getTokens());

            if (!message) {
                message = await channel.send({ embeds: [liveEmbed] }).catch(() => clearInterval(interval));
                return;
            }

            await message.edit({ embeds: [liveEmbed] }).catch(() => clearInterval(interval));
        }, 60000);

        interaction.reply({
            content: `**    **:white_check_mark: <@!${interaction.user.id}> Eu irei mandar uma mensagem no canal <#${channelId}> com informações do estoque que serão atualizadas a cada 1 minuto.`,
            flags: ["Ephemeral"]
        });
        interval._onTimeout();
    }
};
