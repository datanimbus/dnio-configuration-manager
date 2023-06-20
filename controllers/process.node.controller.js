const mongoose = require('mongoose');
const router = require('express').Router({ mergeParams: true });

const dataStackUtils = require('@appveen/data.stack-utils');

const queryUtils = require('../utils/query.utils');


let logger = global.logger;

const nodeModel = mongoose.model('process.nodes');


router.get('/', async (req, res) => {
	let txnId = req.get('txnId');
	try {
		logger.info(`[${txnId}] Show all Process Flows Nodes request received. CountOnly? ${req.query.countOnly}`);
		logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		const filter = queryUtils.parseFilter(req.query.filter);
		if (filter) {
			filter.app = filter.app || req.locals.app;
		}

		logger.debug(`[${txnId}] Parsed Filters :: ${JSON.stringify(filter)}`);


		if (req.query.countOnly) {
			const count = await nodeModel.countDocuments(filter);

			logger.info(`[${txnId}] Count of Process Flows Nodes :: ${count}`);

			return res.status(200).json(count);
		}

		const data = queryUtils.getPaginationData(req);
		logger.debug(`[${txnId}] Pagination details :: ${JSON.stringify(data)}`);

		const docs = await nodeModel.find(filter).select(data.select).sort(data.sort).skip(data.skip).limit(data.count).lean();

		logger.info(`[${txnId}] Process Flow Nodes count :: ${docs.length}`);
		logger.trace(`[${txnId}] Process Flow Nodes :: ${JSON.stringify(docs)}`);

		return res.status(200).json(docs);
	} catch (err) {
		logger.error(`[${txnId}] Error fetching all Process Flow Nodes :: ${err.message || err}`);

		res.status(500).json({
			message: err.message
		});
	}
});


router.get('/:id', async (req, res) => {
	let txnId = req.get('txnId');
	let id = req.params.id;
	try {
		logger.info(`[${txnId}] Show Process Flow Node request received for ID :: ${id}`);
		logger.debug(`[${txnId}] Query Select options :: ${JSON.stringify(req.query.select)}`)


		let mongoQuery = nodeModel.findById(id);
		if (req.query.select) {
			mongoQuery = mongoQuery.select(req.query.select);
		}

		let doc = await mongoQuery.lean();
		if (!doc) {
			logger.info(`[${txnId}] Process Flow Node data not found.`);

			return res.status(404).json({
				message: 'Process Flow Node Not Found.'
			});
		}

		logger.info(`[${txnId}] Process Flow Node data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow Node doc :: ${JSON.stringify(doc)}`);

		return res.status(200).json(doc);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching Process Flow Node for ID :: ${id} :: ${err.message || err}`);

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

		logger.info(`[${txnId}] Process Flow Node create request received`);
		logger.trace(`[${txnId}] Process Flow Node payload :: ${JSON.stringify(payload)}`);


		payload.app = payload.app || req.locals.app;
		payload.version = 1;


		logger.trace(`[${txnId}] Process Flow Node final payload :: ${JSON.stringify(payload)}`);

		let doc = new nodeModel(payload);
		doc._req = req;
		const status = await doc.save();

		logger.info(`[${txnId}] Process Flow Node create status :: ${JSON.stringify(status)}`);
		logger.trace(`[${txnId}] Process Flow Node doc :: ${JSON.stringify(doc)}`);


		let eventId = 'EVENT_PROCESS_FLOW_NODE_CREATE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlowNode', req, doc, null);


		socket.emit('processFlowNodeCreated', {
			app: payload.app,
			message: status.status
		});

		return res.status(200).json(status);

	} catch (err) {
		logger.error(`[${txnId}] Error creating Process Flow Node :: ${err.message || err}`);

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

		logger.info(`[${txnId}] Update Process Flow Node request received for ID :: ${id}`);
		logger.trace(`[${txnId}] Update Process Flow Node payload :: ${JSON.stringify(payload)}`);

		
		let doc = await nodeModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow Node data not found in DB collection.`);

			return res.status(404).json({
				message: 'Process Flow Node Not Found.'
			});
		}

		logger.debug(`[${txnId}] Existing Process Flow Node found in DB collection for ID :: ${id}`);
		logger.trace(`[${txnId}] Existing Process Flow Node data :: ${JSON.stringify(doc)}`);


		payload.app = payload.app || req.locals.app;
		payload.version = doc.version + 1;
		Object.keys(payload).forEach(key => {
			doc[key] = payload[key];
		});
		doc._req = req;
		let status = await doc.save();

		logger.info(`[${txnId}] Process Flow Node update status :: ${JSON.stringify(status)}`);


		let eventId = 'EVENT_PROCESS_FLOW_NODE_UPDATE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlowNode', req, doc, null);


		socket.emit('processFlowNodeStatus', {
			_id: id,
			app: flowData.app,
			message: 'Updated'
		});

		return res.status(200).json(status);

	} catch (err) {
		logger.error(`[${txnId}] Error updating Process Flow Node :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.delete('/:id', async (req, res) => {
	let txnId = req.get('TxnId');
	try {
		let id = req.params.id;
		let socket = req.app.get('socket');

		logger.info(`[${txnId}] Delete Process Flow request received for ID :: ${id}`);


		let doc = await nodeModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow Node data not found for ID :: ${id}`);

			return res.status(404).json({
				message: 'Process Flow Node Not Found.'
			});
		}

		logger.debug(`[${txnId}] Process Flow Node data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow Node data :: ${JSON.stringify(doc)}`);


		doc._req = req;
		await doc.remove();


		let eventId = 'EVENT_PROCESS_FLOW_NODE_DELETE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlowNode', req, doc, null);


		socket.emit('processFlowNodeDeleted', {
			_id: id,
			app: doc.app,
			message: 'Deleted'
		});


		logger.info(`[${txnId}] Deleted Process Flow Node for ID :: ${id}`);
		
		return res.status(200).json({ message: 'Process Flow Node Deleted.' });

	} catch (err) {
		logger.error(`[${txnId}] Error deleteing Process Flow Node :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
