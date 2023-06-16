const mongoose = require('mongoose');

const dataStackUtils = require('@appveen/data.stack-utils');

const queue = require('../queue');
const commonUtils = require('../utils/common.utils');
const mongooseUtils = require('../utils/mongoose.utils.js');
const definition = require('../schemas/data-format.schema').definition;


const client = queue.getClient();
dataStackUtils.eventsUtil.setNatsClient(client);


const schema = mongooseUtils.MakeSchema(definition);


schema.plugin(mongooseUtils.metadataPlugin());


schema.index({ name: 1, app: 1 }, { unique: true, sparse: true, collation: { locale: 'en_US', strength: 2 } });


schema.post('save', function (error, doc, next) {
	if ((error.errors && error.errors.name) || error.name === 'ValidationError' || error.message.indexOf('E11000') > -1
		|| error.message.indexOf('__CUSTOM_NAME_DUPLICATE_ERROR__') > -1) {
		next(new Error('Data Format name is already in use'));
	} else {
		next(error);
	}
});

schema.pre('save', mongooseUtils.generateId('DF', 'b2b.dataFormats', null, 4, 2000));

schema.pre('save', dataStackUtils.auditTrail.getAuditPreSaveHook('dataFormat'));

schema.post('save', dataStackUtils.auditTrail.getAuditPostSaveHook('dataFormat.audit', client, 'auditQueue'));

schema.pre('remove', dataStackUtils.auditTrail.getAuditPreRemoveHook());

schema.post('remove', dataStackUtils.auditTrail.getAuditPostRemoveHook('dataFormat.audit', client, 'auditQueue'));

schema.pre('save', function (next) {
	this._isNew = this.isNew;
	if (!this.app) {
		return next(new Error('App Value is Mandatory'));
	}
	if (!this.definition) return next();
	let temp;
	if (typeof this.definition === 'string') {
		temp = JSON.parse(this.definition);
	} else {
		temp = this.definition;
	}
	if (temp && temp.length > 0) {
		this.attributeCount = commonUtils.countAttr(temp);
	}
	next();
});

schema.post('save', function (doc) {
	if (!doc._req) {
		doc._req = {};
	}
	if (doc._isNew) {
		dataStackUtils.eventsUtil.publishEvent('EVENT_DF_CREATE', 'dataFormat', doc._req, doc);
	} else {
		dataStackUtils.eventsUtil.publishEvent('EVENT_DF_UPDATE', 'dataFormat', doc._req, doc);
	}
});

schema.post('remove', function (doc) {
	if (!doc._req) {
		doc._req = {};
	}
	dataStackUtils.eventsUtil.publishEvent('EVENT_DF_DELETE', 'dataFormat', doc._req, doc);
});


mongoose.model('dataFormat', schema, 'b2b.dataFormats');
