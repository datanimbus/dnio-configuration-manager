const mongoose = require('mongoose');

const config = require('../config');
const mongooseUtils = require('../utils/mongoose.utils');
const definition = require('../schemas/agent-action.schema').definition;


const schema = mongooseUtils.MakeSchema(definition);
const expiry = config.hbFrequency * config.hbMissCount;


schema.plugin(mongooseUtils.metadataPlugin());
schema.pre('save', mongooseUtils.generateId('ACTION', 'b2b.agent.actions', null, 4, 1000));
schema.index({ timestamp: 1 }, { expireAfterSeconds: expiry });


mongoose.model('agent-action', schema, 'b2b.agent.actions');
