const _ = require('lodash');
const mongoose = require('mongoose');
const router = require('express').Router({ mergeParams: true });

const dataStackUtils = require('@appveen/data.stack-utils');

const config = require('../config');
const processflowUtils = require('../utils/process.flow.utils');
const queryUtils = require('../utils/query.utils');
const deployUtils = require('../utils/deploy.utils');


let logger = global.logger;

const processflowModel = mongoose.model('process.flows');
const draftProcessflowModel = mongoose.model('process.flows.draft');


function mergeCustomizer(objValue, srcValue) {
	if (_.isArray(objValue)) {
		return srcValue;
	}
}


router.get('/', async (req, res) => {
	let txnId = req.get('txnId');
	try {
		logger.info(`[${txnId}] Show all Process Flows request received. CountOnly? ${req.query.countOnly || 'false'}`);
		logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		const filter = queryUtils.parseFilter(req.query.filter);
		if (filter) {
			filter.app = filter.app || req.locals.app;
		}

		logger.debug(`[${txnId}] Parsed Filters :: ${JSON.stringify(filter)}`);


		if (req.query.countOnly) {
			const count = await processflowModel.countDocuments(filter);

			logger.info(`[${txnId}] Count of Process Flows found :: ${count}`);

			return res.status(200).json(count);
		}

		const data = queryUtils.getPaginationData(req);
		logger.debug(`[${txnId}] Pagination details :: ${JSON.stringify(data)}`);

		const docs = await processflowModel.find(filter).select(data.select).sort(data.sort).skip(data.skip).limit(data.count).lean();

		logger.info(`[${txnId}] Process Flow docs count :: ${docs.length}`);
		logger.trace(`[${txnId}] Process Flow docs :: ${JSON.stringify(docs)}`);

		return res.status(200).json(docs);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching all Process Flows :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.get('/:id', async (req, res) => {
	let txnId = req.get('txnId');
	let id = req.params.id;
	try {
		let draft = req.query.draft;

		logger.info(`[${txnId}] Show Process Flow request received for ID :: ${id} :: draft? :: ${draft || 'false'}`);
		logger.debug(`[${txnId}] Query Select options :: ${JSON.stringify(req.query.select)}`)

		if (draft) {
			let draftQuery = draftProcessflowModel.findById(id);
			if (req.query.select) {
				draftQuery = draftQuery.select(req.query.select);
			}

			let draftDoc = await draftQuery.lean();

			if (draftDoc) {
				logger.info(`[${txnId}] Process Flow draft found`);
				logger.trace(`[${txnId}] Process Flow draft :: ${JSON.stringify(draftDoc)}`);

				return res.status(200).json(draftDoc);
			}

			logger.debug(`[${txnId}] Process Flow draft not found in draft collection, checking in main collection`);
		}

		let mongoQuery = processflowModel.findById(id);
		if (req.query.select) {
			mongoQuery = mongoQuery.select(req.query.select);
		}

		let doc = await mongoQuery.lean();
		if (!doc) {
			logger.info(`[${txnId}] Process Flow data not found.`);
			
			return res.status(404).json({
				message: 'Process Flow Not Found.'
			});
		}

		logger.info(`[${txnId}] Process Flow data found.`);
		logger.trace(`[${txnId}] Process Flow doc :: ${JSON.stringify(doc)}`);

		return res.status(200).json(doc);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching Process Flow for ID :: ${id} :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.post('/', async (req, res) => {
	let txnId = req.get('TxnId');
	try {
		let socket = req.app.get('socket');
		let payload = JSON.parse(JSON.stringify(req.body));

		logger.info(`[${txnId}] Process Flow create request received`);
		logger.trace(`[${txnId}] Process Flow payload :: ${JSON.stringify(payload)}`);


		payload.app = payload.app || req.locals.app;

		const errorMsg = processflowUtils.validatePayload(payload);
		if (errorMsg) {
			logger.error(`[${txnId}] Error validating payload :: ${errorMsg}`);

			return res.status(400).json({ message: errorMsg });
		}

		delete payload.__v;
		delete payload.version;
		delete payload.draftVersion;
		delete payload.status;
		delete payload.port;
		delete payload.deploymentName;
		delete payload.namespace;

		payload.version = 1;


		logger.trace(`[${txnId}] Process Flow final payload :: ${JSON.stringify(payload)}`);

		const doc = new processflowModel(payload);
		doc._req = req;
		const status = await doc.save();

		logger.info(`[${txnId}] Process Flow create status :: ${JSON.stringify(status)}`);
		logger.trace(`[${txnId}] Process Flow doc :: ${JSON.stringify(doc)}`);


		let eventId = 'EVENT_PROCESS_FLOW_CREATE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


		socket.emit('processFlowCreated', {
			app: payload.app,
			url: payload.url,
			port: status.port,
			deploymentName: status.deploymentName,
			namespace: status.namespace,
			message: status.status
		});

		return res.status(200).json(status);

	} catch (err) {
		logger.error(`[${txnId}] Error creating Process Flow :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:id', async (req, res) => {
	let txnId = req.get('TxnId');
	try {
		let id = req.params.id;
		let socket = req.app.get('socket');
		let payload = JSON.parse(JSON.stringify(req.body));

		logger.info(`[${txnId}] Update Process Flow request received for ID :: ${id}`);
		logger.trace(`[${txnId}] Update Process Flow payload :: ${JSON.stringify(payload)}`);


		payload.app = payload.app || req.locals.app;

		const errorMsg = processflowUtils.validatePayload(payload);
		if (errorMsg) {
			logger.error(`[${txnId}] Error validating payload :: ${errorMsg}`);

			return res.status(400).json({ message: errorMsg });
		}


		let doc = await processflowModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow data not found in DB collection`);

			return res.status(404).json({
				message: 'Process Flow Not Found.'
			});
		}

		logger.debug(`[${txnId}] Existing Process Flow found in DB collection for ID :: ${id}`);
		logger.trace(`[${txnId}] Existing Process Flow data :: ${JSON.stringify(doc)}`);


		let flowData = JSON.parse(JSON.stringify(doc));
		let status;

		delete payload._id;
		delete payload.__v;
		delete payload.version;
		delete payload.draftVersion;
		delete payload.status;
		delete payload.port;
		delete payload.deploymentName;
		delete payload.namespace;
		payload._id = id;


		if (flowData.status === 'Draft') {

			_.merge(doc, payload, mergeCustomizer);
			if (payload.inputNode && !_.isEmpty(payload.inputNode)) {
				doc.inputNode = payload.inputNode;
			}
			if (payload.nodes && !_.isEmpty(payload.nodes)) {
				doc.nodes = payload.nodes;
			}


			logger.debug(`[${txnId}] Process Flow is in draft status`);
			logger.trace(`[${txnId}] Process Flow data to be updated :: ${JSON.stringify(doc)}`);


			doc._req = req;
			doc.markModified('inputNode');
			doc.markModified('nodes');
			doc.markModified('dataStructures');

			status = await doc.save();

		} else if (flowData.draftVersion) {

			logger.debug(`[${txnId}] Process Flow is not in draft status, but has a draft linked to it`);

			let draftData = await draftProcessflowModel.findOne({ _id: id, '_metadata.deleted': false });

			logger.trace(`[${txnId}] Existing Process Flow draft data :: ${JSON.stringify(draftData)}`);
			logger.trace(`[${txnId}] Process Flow data to be updated :: ${JSON.stringify(payload)}`);

			draftData = Object.assign(draftData, payload);
			draftData._req = req;

			status = await draftData.save();

		} else {
			logger.debug(`[${txnId}] Process Flow is neither in draft status nor has a linked draft, creating a new draft`);

			let newData = new draftProcessflowModel(Object.assign({}, JSON.parse(JSON.stringify(doc)), payload));

			newData.version = flowData.version + 1;
			newData.status = 'Draft';
			doc.draftVersion = newData.version;

			logger.trace(`[${txnId}] Existing Process Flow data to be updated :: ${JSON.stringify(doc)}`);
			logger.trace(`[${txnId}] New draft Process Flow data to be created :: ${JSON.stringify(newData)}`);

			newData._req = req;
			doc._req = req;

			status = await newData.save();
			await doc.save();
		}

		logger.info(`[${txnId}] Process Flow update status :: ${JSON.stringify(status)}`);


		let eventId = 'EVENT_PROCESS_FLOW_UPDATE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


		socket.emit('processFlowStatus', {
			_id: id,
			app: flowData.app,
			url: flowData.url,
			port: flowData.port,
			deploymentName: flowData.deploymentName,
			namespace: flowData.namespace,
			message: 'Updated'
		});

		return res.status(200).json(status);

	} catch (err) {
		logger.error(`[${txnId}] Error updating Process Flow :: ${err.message || err}`);

		if (err.message.includes('NAME_ERROR')) {
			res.status(400).json({
				message: err.message
			});
		} else {
			res.status(500).json({
				message: err.message
			});
		}
	}
});


router.delete('/:id', async (req, res) => {
	let txnId = req.get('TxnId');
	try {
		let id = req.params.id;
		let socket = req.app.get('socket');

		logger.info(`[${txnId}] Delete Process Flow request received for ID :: ${id}`);


		let doc = await processflowModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow data not found for ID :: ${id}`);

			return res.status(404).json({
				message: 'Process Flow Not Found.'
			});
		}

		logger.debug(`[${txnId}] Process Flow data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow data :: ${JSON.stringify(doc)}`);


		if (doc.status != 'Stopped' && doc.status != 'Draft') {
			logger.info(`[${txnId}] Process Flow is in Active state.`);

			return res.status(400).json({
				message: 'Running flows cannot be deleted.'
			});
		}


		let draftData = await draftProcessflowModel.findOne({ _id: id, '_metadata.deleted': false });

		if (!draftData) {
			logger.debug(`[${txnId}] Process Flow Draft data not available for ID :: ${id}`);

		} else {
			logger.debug(`[${txnId}] Process Flow draft data found for ID :: ${id}`);
			logger.trace(`[${txnId}] Process Flow draft data :: ${JSON.stringify(draftData)}`);

			draftData._req = req;
			await draftData.remove();
		}


		if (config.isK8sEnv() && doc.status == 'Active') {
			logger.debug(`[${txnId}] On K8s Env, undeploying Process Flow :: ${id}`);

			const status = await deployUtils.undeploy(doc);
			if (status.statusCode !== 200 && status.statusCode !== 202) {
				return res.status(status.statusCode).json({ 
					message: 'Unable to stop Process Flow.'
				});
			}
		}


		doc._req = req;
		await doc.remove();


		let eventId = 'EVENT_PROCESS_FLOW_DELETE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


		socket.emit('processFlowDeleted', {
			_id: id,
			app: doc.app,
			url: doc.url,
			port: doc.port,
			deploymentName: doc.deploymentName,
			namespace: doc.namespace,
			message: 'Deleted'
		});


		logger.info(`[${txnId}] Deleted Process Flow for ID :: ${id}`);

		return res.status(200).json({ message: 'Process Flow Deleted.' });

	} catch (err) {
		logger.error(`[${txnId}] Error deleteing Process Flow :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
