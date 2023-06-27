const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');


const logger = global.logger;

const activitiesModel = mongoose.model('process.activities');
const processflowModel = mongoose.model('process.flows');


function validatePayload(payload) {
	if (!payload.name) {
		return 'Name is mandatory';
	}
	// if (!payload.inputNode || !payload.inputNode.type) {
	// 	return 'Input Node is required';
	// }
}


async function createActivity(req, options) {
	let txnId = req.get('txnId');
	const flowId = options.flowId;
	try {
		let socket = req.app.get('socket');
		
		logger.info(`[${txnId}] Creating Process Flow Activity for Flow ID :: ${flowId}`)
		

		if (!req.headers['data-stack-txn-id']) {
			req.headers['data-stack-txn-id'] = uuid();
			logger.info(`No txn id found. Setting txn id to : ${req.headers['data-stack-txn-id']}`);
		}
		if (!req.headers['data-stack-remote-txn-id']) {
			req.headers['data-stack-remote-txn-id'] = `${uuid()}`;
			logger.info(`No remote txn id found. Setting remote txn id to : ${req.headers['data-stack-remote-txn-id']}`);
		}


		const activityData = {};
		activityData.flowId = flowId;
		activityData.headers = req.headers;
		activityData.app = req.params.app;
		activityData.status = 'PENDING';

		const doc = new activitiesModel(activityData);

		logger.debug(`[${txnId}] Process Flow Activity Data :: ${activityData}`);


		await processflowModel.findOneAndUpdate({ _id: flowId }, { $set: { lastInvoked: doc._metadata.createdAt } })


		doc._req = req;
		const status = await doc.save();


		socket.emit('activityCreated', {
			_id: doc._id,
			app: doc.app,
			url: doc.url,
			port: doc.port,
			deploymentName: doc.deploymentName,
			namespace: doc.namespace,
			message: 'Created'
		});
		
		
		logger.info(`Activity Created for [${req.headers['data-stack-txn-id']}] [${req.headers['data-stack-remote-txn-id']}]`);
		logger.trace(`Process Flow Activity Data :: ${JSON.stringify(doc)}`);
		logger.debug(`Process Flow Activity Status :: ${JSON.stringify(status)}`);
		
		return status;
	} catch (err) {
		logger.error(`Error creating Process Flow Activity for Flow ID :: ${flowId} :: ${err}`);
	}
}


module.exports.validatePayload = validatePayload;
module.exports.createActivity = createActivity;
