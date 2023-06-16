const mongoose = require('mongoose');

const mongooseUtils = require('../utils/mongoose.utils');
const definition = require('../schemas/interaction.schema').definition;


const schema = mongooseUtils.MakeSchema(definition);


schema.plugin(mongooseUtils.metadataPlugin());


schema.pre('save', mongooseUtils.generateId('INTR', 'interations', null, 4, 1000));


mongoose.model('interaction', schema, 'b2b.interactions');
