'use strict';

const { Schema, model } = require('mongoose');

exports.tokens = model('tokens', new Schema({
    discordId: { type: String, required: true },
    email: { type: String },
    password: { type: String },
    token: { type: String },
    type: { type: String, required: true },
    token_redirect: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    refreshDate: { type: Date, default: new Date() },
    limitServer: { type: Boolean, default: false },
    nitrada: { type: Boolean, default: false },
    badtoken: { type: Boolean, default: false }
}));

exports.links = model('links', new Schema({
    state: { type: String, required: true },
    invoiceID: { type: String, required: true },
    type: { type: String, required: true },
    count: { type: Number, required: true },
    bot_token: { type: String, required: true },
    used: { type: Boolean, default: false },
    create_inf: {
        owner_id: { type: String, required: true },
        bot_id: { type: String, required: true },
        time: { type: String, required: true },
    },
    user_bought: { type: String },
    channel_id: { type: String },
    guild: { type: String },
    timeUsed: { type: String },
    removed: { type: Boolean, default: false },
    user_removed: { type: String },
}));

exports.payments = model('payments', new Schema({
    id: { type: String, required: true },
    channelId: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
    author: { type: String, required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true }
}));

exports.channels = model('channels', new Schema({
    channelId: { type: String, required: true },
    userId: { type: String, required: true }
}));

exports.panels = model('panels', new Schema({
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    customId: { type: String, required: true }
}));