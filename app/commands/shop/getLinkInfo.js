const { 
    ApplicationCommandOptionType,
    ApplicationCommandType,
    EmbedBuilder 
} = require('discord.js');

module.exports = {
    name: 'info',
    description: 'Veja informações sobre um link que tenha sido criado anteriormente.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'code',
            description: 'Link State',
            type: ApplicationCommandOptionType.String,
            required: true,
            minLength: 20,
            maxLength: 20
        }
    ],
    async run(client, interaction) {
        const code = interaction.options.getString('code');
        const match = await client.db.links.findOne({
            $or: [
                { invoiceID: code },
                { state: code }
            ]
        }).catch(() => null);
        
        const formatField = (value, fallback = '❔ Informação indisponível') => value ? `\`${value}\`` : `*${fallback}*`;

        const getUserTagAndId = (id) => {
            const user = client.users.cache.get(id);
            return user ? `${user.tag} (${id})` : `ID: ${id}`;
        };

        const formatDate = (isoString) => {
            if (!isoString) return '❔ Informação indisponível';
            const date = new Date(isoString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
        };

        const isServer = interaction.guild !== null;

        if (match?.count) {
            const embed = new EmbedBuilder()
                .setTitle('🔗 **Detalhes do Link**')
                .addFields(
                    { name: 'Dono', value: formatField(match.create_inf?.owner_id ? getUserTagAndId(match.create_inf.owner_id) : null), inline: true },
                    { name: 'Bot', value: formatField(match.create_inf?.bot_id ? getUserTagAndId(match.create_inf.bot_id) : null), inline: true },
                    { name: 'Criado em', value: formatDate(match.create_inf?.time), inline: true },
                    { name: 'State', value: formatField(match.state), inline: true },
                    { name: 'Tipo', value: match.type === '1m' ? '1 Mês' : '3 Mês', inline: true },
                    { name: 'Quantidade', value: formatField(match.count), inline: true },
                    { name: 'Usado', value: match.used ? `Sim | ${formatDate(match.timeUsed)}` : 'Não', inline: true },
                    { name: 'Quem Comprou', value: formatField(match.user_bought ? getUserTagAndId(match.user_bought) : null), inline: true },
                    { name: 'Deletado', value: match.removed ? 'Sim' : 'Não', inline: true },
                    { name: 'Quem Deletou', value: formatField(match.user_removed ? getUserTagAndId(match.user_removed) : null), inline: true },
                )
                .setColor('#FF007F')
                .setThumbnail(interaction.user.avatarURL({ dynamic: true, size: 512 }))
                .setFooter({ 
                    text: `Solicitado por ${interaction.user.username}`, 
                    iconURL: interaction.user.avatarURL({ dynamic: true })
                })
                .setTimestamp();
s
            return interaction.reply({
                embeds: [embed],
                ephemeral: isServer
            });
        } else {
            return interaction.reply({
                content: `❌ **Não consegui encontrar informações para o link com o código \`${code}\`.**`,
                ephemeral: isServer
            });
        }
    }
};
