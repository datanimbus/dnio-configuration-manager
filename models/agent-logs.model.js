const mongoose = require('mongoose');

const mongooseUtils = require('../utils/mongoose.utils');
const definition = require('../schemas/agent-logs.schema').definition;


const schema = mongooseUtils.MakeSchema(definition);


schema.plugin(mongooseUtils.metadataPlugin());


mongoose.model('agent-logs', schema, 'b2b.agent.logs');
