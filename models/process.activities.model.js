const mongoose = require('mongoose');

const mongooseUtils = require('../utils/mongoose.utils');
const definition = require('../schemas/process.activities.schema').definition;


const schema = mongooseUtils.MakeSchema(definition);


schema.plugin(mongooseUtils.metadataPlugin());


schema.pre('save', mongooseUtils.generateId('ACTV', 'process.activities', null, 4, 1000));


mongoose.model('process.activities', schema, 'process.activities');
