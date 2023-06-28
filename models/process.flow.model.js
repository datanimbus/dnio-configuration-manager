const _ = require('lodash');
const mongoose = require('mongoose');

const utils = require('@appveen/utils');
const dataStackUtils = require('@appveen/data.stack-utils');

const queue = require('../queue');
const config = require('../config');
const mongooseUtils = require('../utils/mongoose.utils');

const definition = require('../schemas/process.flow.schema').definition;
const draftDefinition = JSON.parse(JSON.stringify(definition));


let logger = global.logger;


const client = queue.getClient();
dataStackUtils.eventsUtil.setNatsClient(client);


const schema = mongooseUtils.MakeSchema(definition);
const draftSchema = mongooseUtils.MakeSchema(draftDefinition);


schema.index({ name: 1, app: 1 }, { unique: true, sparse: true, collation: { locale: 'en_US', strength: 2 } });
// schema.index({ 'inputNode.options.path': 1, app: 1 }, { unique: true, sparse: true, collation: { locale: 'en_US', strength: 2 } });


schema.plugin(mongooseUtils.metadataPlugin());
draftSchema.plugin(mongooseUtils.metadataPlugin());


schema.pre('save', function (next) {
	if (!this.inputNode || !this.inputNode.type) {
		return next(new Error('Input Node is Mandatory'));
	}
	if (this.isNew) {
		if (!this.inputNode || !this.inputNode.options) {
			this.inputNode.options = {};
		}
		if (this.inputNode && this.inputNode.options && this.inputNode.options.path && this.inputNode.options.path.trim()) {
			this.inputNode.options.path = this.inputNode.options.path.trim();
			if (this.inputNode.options.path.trim().charAt(0) != '/') {
				this.inputNode.options.path = '/' + this.inputNode.options.path;
			}
		}
		if (!this.inputNode.options.path || !this.inputNode.options.path.trim()) {
			this.inputNode.options.path = '/' + _.camelCase(this.name);
		}
		// if (this.nodes && this.nodes.length == 1 && this.inputNode.type == 'FILE' && this.nodes[0].type == 'FILE') {
		// 	this.isBinary = true;
		// }
		if (!this.deploymentName) {
			this.deploymentName = 'pf-' + _.camelCase(this.name).toLowerCase();
		}
		if (!this.namespace) {
			this.namespace = (config.DATA_STACK_NAMESPACE + '-' + this.app).toLowerCase();
		}
	}
	this.increment();
	next();
});

draftSchema.pre('save', function (next) {
	if (!this.inputNode || !this.inputNode.type) {
		return next(new Error('Input Node is Mandatory'));
	}
	if (this.isNew) {
		if (!this.inputNode || !this.inputNode.options) {
			this.inputNode.options = {};
		}
		if (this.inputNode && this.inputNode.options && this.inputNode.options.path && this.inputNode.options.path.trim()) {
			this.inputNode.options.path = this.inputNode.options.path.trim();
			if (this.inputNode.options.path.trim().charAt(0) != '/') {
				this.inputNode.options.path = '/' + this.inputNode.options.path;
			}
		}
		if (!this.inputNode.options.path || !this.inputNode.options.path.trim()) {
			this.inputNode.options.path = '/' + _.camelCase(this.name);
		}
		
		if (!this.deploymentName) {
			this.deploymentName = 'pf-' + _.camelCase(this.name).toLowerCase();
		}
		if (!this.namespace) {
			this.namespace = (config.DATA_STACK_NAMESPACE + '-' + this.app).toLowerCase();
		}
	}
	this.increment();
	next();
});


schema.pre('save', function (next) {
	// One extra character for / in api
	let apiregx = /^\/[a-zA-Z]+[a-zA-Z0-9]*$/;
	var nameregx = /^[a-zA-Z]+[a-zA-Z0-9_ -]*$/;

	if (this.inputNode?.options?.path?.length > 40) {
		return next(new Error('API endpoint length cannot be greater than 40'));
	}

	if (this.inputNode?.options?.path?.match(apiregx)) {
		if (this.name?.match(nameregx)) {
			next();
		} else {
			next(new Error('PROCESS_FLOW_NAME_ERROR :: Name must consist of alphanumeric characters and/or underscore and space and must start with an alphabet.'));
		}
	} else {
		next(new Error('PROCESS_FLOW_NAME_ERROR :: API Endpoint must consist of alphanumeric characters and must start with \'/\' and followed by an alphabet.'));
	}
});

draftSchema.pre('save', function (next) {
	// One extra character for / in api
	let apiregx = /^\/[a-zA-Z]+[a-zA-Z0-9]*$/;
	var nameregx = /^[a-zA-Z]+[a-zA-Z0-9_ -]*$/;

	if (this.inputNode?.options?.path?.length > 40) {
		return next(new Error('API endpoint length cannot be greater than 40'));
	}

	if (this.inputNode?.options?.path?.match(apiregx)) {
		if (this.name?.match(nameregx)) {
			next();
		} else {
			next(new Error('PROCESS_FLOW_NAME_ERROR :: Name must consist of alphanumeric characters and/or underscore and space and must start with an alphabet.'));
		}
	} else {
		next(new Error('PROCESS_FLOW_NAME_ERROR :: API Endpoint must consist of alphanumeric characters and must start with \'/\' and followed by an alphabet.'));
	}
});


schema.pre('save', utils.counter.getIdGenerator('PF', 'process.flows', null, 4, 1000));


schema.pre('save', dataStackUtils.auditTrail.getAuditPreSaveHook('process.flows'));


schema.post('save', function (error, doc, next) {
	if ((error.errors && error.errors.name) || error.name === 'ValidationError' ||
		error.message.indexOf('E11000') > -1 || error.message.indexOf('__CUSTOM_NAME_DUPLICATE_ERROR__') > -1) {
		logger.error('ProcessFlow - Flow name is already in use, not saving doc - ' + doc._id);
		logger.error(error);
		next(new Error('ProcessFlow name is already in use'));
	} else {
		next(error);
	}
});


schema.post('save', dataStackUtils.auditTrail.getAuditPostSaveHook('process.flows.audit', client, 'auditQueue'));


schema.post('save', function (doc) {
	if (!doc._req) {
		doc._req = {};
	}
	if (doc._isNew) {
		dataStackUtils.eventsUtil.publishEvent('EVENT_PROCESS_FLOW_CREATE', 'processFlow', doc._req, doc);
	} else {
		dataStackUtils.eventsUtil.publishEvent('EVENT_PROCESS_FLOW_UPDATE', 'processFlow', doc._req, doc);
	}
});


schema.pre('remove', dataStackUtils.auditTrail.getAuditPreRemoveHook());


schema.post('remove', dataStackUtils.auditTrail.getAuditPostRemoveHook('process.flows.audit', client, 'auditQueue'));


schema.post('remove', function (doc) {
	if (!doc._req) {
		doc._req = {};
	}
	dataStackUtils.eventsUtil.publishEvent('EVENT_PROCESS_FLOW_DELETE', 'processFlow', doc._req, doc);
});


mongoose.model('process.flows', schema, 'process.flows');
mongoose.model('process.flows.draft', draftSchema, 'process.flows.draft');
