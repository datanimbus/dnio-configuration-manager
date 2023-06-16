const _ = require('lodash');
const mongoose = require('mongoose');
const router = require('express').Router({ mergeParams: true });

const config = require('../config');
const queryUtils = require('../utils/query.utils');


let logger = global.logger;

const activitiesModel = mongoose.model('process.activities');
const processflowModel = mongoose.model('process.flows');


router.get('/:flowId', async (req, res) => {
	let txnId = req.get('txnId');
	let flowId = req.params.flowId;
	try {
		logger.info(`[${txnId}] Show all Process Flows Activities request received for ID :: ${flowId}`);
		logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		const filter = queryUtils.parseFilter(req.query.filter);
		if (filter) {
			filter.app = filter.app || req.locals.app;
		}
		filter.flowId = flowId;

		logger.debug(`[${txnId}] Parsed Filters :: ${JSON.stringify(filter)}`);


		if (req.query.countOnly) {
			const count = await activitiesModel.countDocuments(filter);

			logger.info(`[${txnId}] Count of Process Flows Activities found :: ${count}`);

			return res.status(200).json(count);
		}


		const data = queryUtils.getPaginationData(req);
		logger.debug(`[${txnId}] Pagination details :: ${JSON.stringify(data)}`);

		const docs = await activitiesModel.find(filter).select(data.select).sort(data.sort).skip(data.skip).limit(data.count).lean();

		logger.info(`[${txnId}] Process Flow Activities docs count :: ${docs.length}`);
		logger.trace(`[${txnId}] Process Flow Activities docs :: ${JSON.stringify(docs)}`);

		return res.status(200).json(docs);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching all Process Flows Activities for Flow ID :: ${flowId} :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.get('/:flowId/:id', async (req, res) => {
	let txnId = req.get('txnId');
	let flowId = req.params.flowId;
	let id = req.params.id;
	try {
		logger.info(`[${txnId}] Show Process Flows Activity request received for Flow ID :: ${flowId} :: Activity ID :: ${id}`);
		logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		let doc = await activitiesModel.findById(id).lean();
		if (!doc) {
			logger.info(`[${txnId}] Process Flow Activity data not found.`);

			return res.status(404).json({
				message: 'Process Flow Activity Not Found.'
			});
		}

		logger.info(`[${txnId}] Process Flow Activity data found for Flow ID :: ${flowId} :: Activity ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow Activity doc :: ${JSON.stringify(doc)}`);


		return res.status(200).json(doc);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching Process Flow Activity for Flow ID :: ${flowId} :: Activity ID :: ${id} :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:flowId/:id', async (req, res) => {
	let txnId = req.get('TxnId');
	let id = req.params.id;
	let flowId = req.params.flowId;
	try {
		let payload = JSON.parse(JSON.stringify(req.body));

		logger.info(`[${txnId}] Update Process Flows Activity request received for Flow ID :: ${flowId} :: Activity ID :: ${id}`);
		logger.trace(`[${txnId}] Update Process Flow Activity payload :: ${JSON.stringify(payload)}`);

		
		let doc = await activitiesModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow Activity data not found in DB collection`);

			return res.status(404).json({
				message: 'Process Flow Activity Not Found.'
			});
		}

		logger.debug(`[${txnId}] Existing Process Flow Activity found in DB collection for Flow ID :: ${flowId} :: Activity ID :: ${id}`);
		logger.trace(`[${txnId}] Existing Process Flow Activity data :: ${JSON.stringify(doc)}`);


		_.merge(doc, payload);
		const status = await doc.save(req);

		logger.info(`[${txnId}] Process Flow Activity update status :: ${JSON.stringify(status)}`);


		let eventId = 'EVENT_PROCESS_FLOW_ACTIVITY_UPDATE';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlowActivity', req, doc, null);


		return res.status(200).json(status);

	} catch (err) {
		logger.error(`[${txnId}] Error updating Process Flow Activity for Flow ID :: ${flowId} :: Activity ID :: ${id} :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.get('/:flowId/:id/state', async (req, res) => {
	let txnId = req.get('TxnId');
	let id = req.params.id;
	let flowId = req.params.flowId;
	try {
		logger.info(`[${txnId}] Show all Process Flow Activity States request received for Flow ID :: ${flowId} :: Activity ID :: ${id}`);
		

		let doc = await processflowModel.findById(flowId).lean();
		if (!doc) {
			logger.info(`[${txnId}] Process Flow not found.`);

			return res.status(404).json({
				message: 'Process Flow Not Found.'
			});
		}

		logger.debug(`[${txnId}] Process Flow found for Flow ID :: ${flowId}`);
		logger.trace(`[${txnId}] Process Flow doc :: ${JSON.stringify(doc)}`);


		const dbname = config.DATA_STACK_NAMESPACE + '-' + doc.app;
		logger.debug(`[${txnId}] Connecting to Data DB to fetch States for Flow ID :: ${flowId} :: DB Name :: ${dbname}`);
		
		const appcenterCon = mongoose.connections[1];
		const dataDB = appcenterCon.useDb(dbname);
		const stateCollection = dataDB.collection('process.activities.state');


		const records = await stateCollection.find({ activityId: id }).toArray();
		if (!records) {
			logger.info(`[${txnId}] Process Flow Activity States not found.`);

			return res.status(404).json({
				message: 'Process Flow Activity States Not Found.'
			});
		}

		logger.info(`[${txnId}] Process Flow Activity States found for Flow ID :: ${flowId} :: Activity ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow Activity States doc :: ${JSON.stringify(doc)}`);


		return res.status(200).json(records);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching Process Flow Activity States for Flow ID :: ${flowId} :: Activity ID :: ${id} :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


router.get('/:flowId/:id/state/:stateId/data', async (req, res) => {
	let txnId = req.get('TxnId');
	let id = req.params.id;
	let flowId = req.params.flowId;
	let stateId = req.params.stateId;
	try {
		logger.info(`[${txnId}] Show all Process Flow Activity States Data request received for Flow ID :: ${flowId} :: Activity ID :: ${id} :: State ID :: ${stateId}`);


		let doc = await processflowModel.findById(flowId).lean();
		if (!doc) {
			logger.info(`[${txnId}] Process Flow not found.`);

			return res.status(404).json({
				message: 'Process Flow Not Found.'
			});
		}

		logger.debug(`[${txnId}] Process Flow found for Flow ID :: ${flowId}`);
		logger.trace(`[${txnId}] Process Flow doc :: ${JSON.stringify(doc)}`);


		const dbname = config.DATA_STACK_NAMESPACE + '-' + doc.app;
		logger.debug(`[${txnId}] Connecting to Data DB to fetch States for Flow ID :: ${flowId} :: DB Name :: ${dbname}`);


		const appcenterCon = mongoose.connections[1];
		const dataDB = appcenterCon.useDb(dbname);
		const stateDataCollection = dataDB.collection('process.activities.state.data');


		const record = await stateDataCollection.findOne({ activityId: req.params.id, nodeId: req.params.stateId });
		if (!record) {
			logger.info(`[${txnId}] Process Flow Activity State Data not found.`);

			return res.status(404).json({
				message: 'Process Flow Activity State Data Not Found.'
			});
		}

		logger.info(`[${txnId}] Process Flow Activity State Data found for Flow ID :: ${flowId} :: Activity ID :: ${id} :: State ID :: ${stateId}`);
		logger.trace(`[${txnId}] Process Flow Activity State Data doc :: ${JSON.stringify(doc)}`);

		return res.status(200).json(record);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching Process Flow Activity States for Flow ID :: ${flowId} :: Activity ID :: ${id} :: State ID :: ${stateId} :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
