'use strict';

exports.state = async(client) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let state;
    
    do {
        state = [ ...Array(20) ]
            .map(() => chars[Math.random() * chars.length | 0])
            .join("");
    } while (await client.db.links.findOne({ state }));
    
    return state;
};

exports.mongoHandler = class MongoHandle {
  constructor(client) {
    this.client = client;
    this.client_data = {};
  }
  async update(find_data, edit_data) {
    try {
      const updatedDocument = await this.client.db.resellers
        .findOneAndUpdate(find_data, edit_data, { new: true })
        .lean();
      this.client_data = updatedDocument;
      return this.client_data;
    } catch (error) {
      throw new Error(error);
    }
  }
};

exports.boost = require('./boost-process/boosts');
exports.time = () => new Date().toISOString();