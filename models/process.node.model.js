const mongoose = require('mongoose');

const utils = require('@appveen/utils');
const dataStackUtils = require('@appveen/data.stack-utils');

const queue = require('../queue');
const mongooseUtils = require('../utils/mongoose.utils');
const definition = require('../schemas/process.node.schema').definition;


let logger = global.logger;
const client = queue.getClient();
dataStackUtils.eventsUtil.setNatsClient(client);


const schema = mongooseUtils.MakeSchema(definition);


schema.plugin(mongooseUtils.metadataPlugin());


schema.index({ name: 1, app: 1 }, { unique: true, sparse: true, collation: { locale: 'en_US', strength: 2 } });
// schema.index({ type: 1, category: 1 }, { unique: true, sparse: true });


schema.pre('save', function (next) {
	let regex = /^[a-zA-Z0-9_\s\-\\.]*$/;
	this._isNew = this.isNew;
	if (!this.params) {
		this.params = [];
	}
	if (!this.name) return next(new Error('Node name is required'));
	if (!this.type) return next(new Error('Node Type is required'));
	// if (!this.category) return next(new Error('Node Category is required'));
	if (this.name && this.name.length > 24) return next(new Error('Node name cannot be more than 24 characters'));
	if (this.name && regex.test(this.name)) return next();
	return next(new Error('Node name can contain alphanumeric characters with spaces, dashes and underscores only'));
});

schema.post('save', function (error, doc, next) {
	logger.error(error);
	if (error && error.message && (error.code === 11000
		|| error.message.indexOf('E11000') > -1
	)) {
		if (error.message.indexOf('type') > -1) {
			return next(new Error('Node Type is already in use'));
		}
		if (error.message.indexOf('category') > -1) {
			return next(new Error('Node Category is already in use'));
		}
		return next(new Error('Node name is already in use'));
	} else {
		next(error);
	}
});

schema.pre('save', utils.counter.getIdGenerator('NODE', 'process.nodes', null, null, 1000));

schema.pre('save', dataStackUtils.auditTrail.getAuditPreSaveHook('process.nodes'));

schema.post('save', dataStackUtils.auditTrail.getAuditPostSaveHook('process.nodes.audit', client, 'auditQueue'));

schema.pre('remove', dataStackUtils.auditTrail.getAuditPreRemoveHook());

schema.post('remove', dataStackUtils.auditTrail.getAuditPostRemoveHook('process.nodes.audit', client, 'auditQueue'));


mongoose.model('process.nodes', schema, 'process.nodes');
