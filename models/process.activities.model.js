const mongoose = require('mongoose');

const utils = require('@appveen/utils');

const mongooseUtils = require('../utils/mongoose.utils');
const definition = require('../schemas/process.activities.schema').definition;


const schema = mongooseUtils.MakeSchema(definition);


schema.plugin(mongooseUtils.metadataPlugin());


schema.pre('save', utils.counter.getIdGenerator('ACTV', 'process.activities', null, 4, 1000));


mongoose.model('process.activities', schema, 'process.activities');
