const {
    TextInputBuilder,
    ModalBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonStyle,
    TextInputStyle
} = require('discord.js');

module.exports = async function(client, interaction, type) {
    require('../events/messageComponent')(client);
};
