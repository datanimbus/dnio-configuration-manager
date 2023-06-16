const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const dataStackUtils = require('@appveen/data.stack-utils');

const queue = require('../queue');
const config = require('../config');
const eventUtils = require('../utils/event.utils.js');
const mongooseUtils = require('../utils/mongoose.utils');
const securityUtils = require('../utils/security.utils');
const definition = require('../schemas/agent.schema').definition;


let logger = global.logger;
const schema = mongooseUtils.MakeSchema(definition);

const client = queue.getClient();
dataStackUtils.eventsUtil.setNatsClient(client);


schema.plugin(mongooseUtils.metadataPlugin());

schema.index({ name: 1, app: 1 }, { unique: true, sparse: true, collation: { locale: 'en_US', strength: 2 } });
schema.index({ agentId: 1 });

schema.post('save', function (error, doc, next) {
	logger.error(error);
	if ((error.code === 11000
		|| error?.message?.indexOf('__CUSTOM_NAME_DUPLICATE_ERROR__') > -1
		|| error?.message?.indexOf('E11000') > -1
	)) {
		next(new Error('Agent name is already in use'));
	} else {
		next(error);
	}
});

schema.pre('save', mongooseUtils.generateId('AGENT', 'b2b.agents', null, 4, 2000));

schema.pre('save', dataStackUtils.auditTrail.getAuditPreSaveHook('b2b.agents'));

schema.post('save', dataStackUtils.auditTrail.getAuditPostSaveHook('b2b.agents.audit', client, 'auditQueue'));

schema.pre('remove', dataStackUtils.auditTrail.getAuditPreRemoveHook());

schema.post('remove', dataStackUtils.auditTrail.getAuditPostRemoveHook('b2b.agents.audit', client, 'auditQueue'));

schema.pre('save', function (next) {
	let regex = /^[a-zA-Z0-9_\s\-\\.]*$/;
	this._isNew = this.isNew;
	if (this.name && this.name.length > 24) return next(new Error('Agent name cannot be more than 24 characters'));
	if (this.name && regex.test(this.name)) return next();
	return next(new Error('Agent name can contain alphanumeric characters with spaces, dashes and underscores only'));
});

schema.pre('save', async function (next) {
	if (!this.isNew) {
		this._oldDoc = await mongoose.model('agent').findOne({ _id: this._id }).lean();
		return next();
	}
	return next();
});

schema.pre('save', async function (next) {
	try {
		if (!this.agentId) this.agentId = uuid();
		if (!this.password) {
			const text = securityUtils.generatePassword(8);
			const resp = await securityUtils.encryptText(this.app, text);
			if (!resp || resp.statusCode != 200) {
				return next(new Error('Unable to encrypt data'));
			}
			this.password = resp.body.data;
		}
		if (!this.secret) {
			const text = securityUtils.md5(securityUtils.generatePassword(8));
			const resp = await securityUtils.encryptText(this.app, text);
			if (!resp || resp.statusCode != 200) {
				return next(new Error('Unable to encrypt data'));
			}
			this.secret = resp.body.data;
		}
		next();
	} catch (err) {
		next(err);
	}
});

schema.post('remove', function (doc, next) {
	let obj = {
		'agentId': doc.agentId,
		'appName': '',
		'partnerName': '',
		'flowName': '',
		'action': 'DELETE_AGENT',
		'metaData': '',
		'timestamp': new Date().toString(),
		'entryType': 'IN',
		'sentOrRead': false
	};
	next();
	return mongoose.model('agent-action').create(obj);
});

schema.post('save', function (doc, next) {
	if (!doc._req) {
		doc._req = {};
	}
	const payload = {};
	if (doc._req.eventId && doc._req.eventId.trim()) {
		logger.debug('AGENT EVENT', doc._req.eventId);
		payload.eventId = eventUtils.getAgentEventId(doc.type, doc._req.eventId);
	} else if (doc._oldDoc && doc._oldDoc.status !== doc.status) {
		if (doc.status == 'RUNNING') {
			doc._req.eventId = 'EVENT_AGENT_APP_START';
		}
		logger.debug('AGENT OLD and NEW Status', doc._oldDoc.status, doc.status);
		payload.eventId = eventUtils.getAgentEventId(doc.type, doc._req.eventId);
	}
	if (!doc._oldDoc) {
		payload.eventId = eventUtils.getAgentEventId(doc.type, 'EVENT_AGENT_APP_CREATE');
	}
	if (payload.eventId) {
		payload.priority = eventUtils.getAgentEventPriority(payload.eventId);
		payload.documentId = doc._id;
		payload.documentName = doc.name;
		payload.app = doc.app;
		payload.source = 'agent';
		payload.timestamp = new Date().toISOString();
		payload.triggerType = 'user';
		payload.triggerId = doc._req ? doc._req['user'] : null;
		payload.txnId = doc._req ? doc._req['txnId'] : null;
		logger.debug(payload);
		client.publish(config.eventsQueueName, JSON.stringify(payload));
	}
	next();
});

schema.post('remove', function (doc) {
	if (!doc._req) {
		doc._req = {};
	}
	const payload = {};
	payload.eventId = 'EVENT_AGENT_APP_DELETE';
	payload.priority = 'High';
	payload.documentId = doc._id;
	payload.documentName = doc.name;
	payload.app = doc.app;
	payload.source = 'agent';
	payload.timestamp = new Date().toISOString();
	payload.triggerType = 'user';
	payload.triggerId = doc._req ? doc._req['user'] : null;
	payload.txnId = doc._req ? doc._req['txnId'] : null;
	logger.debug(payload);
	client.publish(config.eventsQueueName, JSON.stringify(payload));
});


mongoose.model('agent', schema, 'b2b.agents');
