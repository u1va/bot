const {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    name: 'delete',
    description: 'Utilize para deletar um link do banco de dados.',
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
        if (!client.config.owners.includes(interaction.user.id)) return interaction.reply({
            content: `**    **:x: <@!${interaction.user.id}> Apenas os **meus desenvolvedores** podem utilizar esse comando!`,
            flags: ["Ephemeral"]
        });
        
        const code = interaction.options.getString('code');
        
        if (!(await client.db.links.findOne({ state: code }))) return interaction.reply({
            content: `**    **:x: <@!${interaction.user.id}> Não consegui encontrar informações sobre um link com o state **\` ${code} \`**.`,
            flags: ["Ephemeral"]
        });
        
        await client.db.links.findOneAndUpdate(
            { state: code },
            { user_removed: interaction.user.id, removed: true }
        );
        
        return interaction.reply(`**    **:white_check_mark: <@!${interaction.user.id}> O link com o state **\` ${code} \`** foi deletado **com sucesso**!`);
    }
};