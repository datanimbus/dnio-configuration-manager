const _ = require('lodash');
const mongoose = require('mongoose');
const yamljs = require('json-to-pretty-yaml');
const router = require('express').Router({ mergeParams: true });

const dataStackUtils = require('@appveen/data.stack-utils');

const config = require('../config');
const k8sUtils = require('../utils/k8s.utils');
const queryUtils = require('../utils/query.utils');
const routerUtils = require('../utils/router.utils');


let logger = global.logger;


const processflowModel = mongoose.model('process.flows');
const draftProcessflowModel = mongoose.model('process.flows.draft');


let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';

let processflowBaseImage = `${dockerReg}data.stack.pf.base:${config.imageTag}`;
if (dockerRegistryType == 'ECR') processflowBaseImage = `${dockerReg}:data.stack.pf.base:${config.imageTag}`;


router.get('/count', async (req, res) => {
    let txnId = req.get('txnId');
	try {
        logger.info(`[${txnId}] Count Process Flows request received.`);
        logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		const filter = queryUtils.parseFilter(req.query.filter);
		if (filter) {
			filter.app = req.locals.app;
		}
        logger.debug(`[${txnId}] Parsed Filters :: ${JSON.stringify(filter)}`);


		const count = await processflowModel.countDocuments(filter);

        logger.info(`[${txnId}] Process Flows count :: ${count}`);

		return res.status(200).json(count);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching count of Process Flows :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.get('/status/count', async (req, res) => {
    let txnId = req.get('txnId');
	try {
        logger.info(`[${txnId}] Count Process Flows by status request received.`);
        logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		let filter = queryUtils.parseFilter(req.query.filter);
		if (filter) {
			filter.app = req.locals.app;
			filter['_metadata.deleted'] = false;
		}
        logger.debug(`[${txnId}] Parsed Filters :: ${JSON.stringify(filter)}`);


		let aggregateQuery = [
			{ $match: filter },
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 }
				}
			}
		];
        logger.debug(`[${txnId}] Aggregate Query :: ${JSON.stringify(aggregateQuery)}`);


		let result = await processflowModel.aggregate(aggregateQuery);
        logger.trace(`[${txnId}] Aggregate Query result :: ${JSON.stringify(result)}`);


		let response = {};
		let total = 0;
		result.forEach(rs => {
			response[rs._id] = rs.count;
			total += rs.count;
		});
		response['Total'] = total;

        logger.trace(`[${txnId}] Process Flows count final :: ${JSON.stringify(response)}`);
		return res.status(200).json(response);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching count of Process Flows by status :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:id/init', async (req, res) => {
    let txnId = req.get('txnId');
	try {
        let id = req.params.id;

        logger.info(`[${txnId}] Process Flows init request received for ID :: ${id}`);


		const doc = await processflowModel.findById(id);
		if (!doc) {
            logger.info(`[${txnId}] Process Flow data not found in DB collection`);

			return res.status(400).json({ message: 'Invalid Flow' });
		}


		doc.status = 'Active';
		doc.isNew = false;
		doc._req = req;
		await doc.save();
		
        logger.info(`[${txnId}] Process Flow status updated for ID :: ${id}`);


        routerUtils.initProcessFlowRouterMap();

        return res.status(200).json({ message: 'Flow Status Updated' });
		
	} catch (err) {
		logger.error(`[${txnId}] Error updating Process Flow status :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:id/deploy', async (req, res) => {
    let txnId = req.get('txnId');
	try {
		let id = req.params.id;
        let socket = req.app.get('socket');


		logger.info(`[${txnId}] Process Flow deploy request received for ID :: ${id}`);


		let user = req.user;
		let isSuperAdmin = user.isSuperAdmin;


		logger.debug(`[${txnId}] Requesting User :: ${JSON.stringify({ user, isSuperAdmin })}`);


		const doc = await processflowModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow data not found for ID :: ${id}`);

			return res.status(400).json({
                message: 'Process Flow Not Found'
            });
		}
        const oldFlowObj = JSON.parse(JSON.stringify(doc));


        logger.debug(`[${txnId}] Process Flow data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow data :: ${JSON.stringify(doc)}`);


		if (doc.status === 'Active' && !doc.draftVersion) {
			logger.info(`[${txnId}] Process Flow is already running, cannot deploy again`);

			return res.status(400).json({ message: 'No changes to redeploy.' });

		} else if (doc.status != 'Draft' && !doc.draftVersion) {
			logger.info(`[${txnId}] Process Flow has no draft version for deployment`);

			return res.status(400).json({ message: 'No changes to redeploy' });

		} else if (doc.status === 'Draft') {
			logger.debug(`[${txnId}] Process Flow is in Draft status`);

			// if (verifyDeploymentUser && !isSuperAdmin && doc._metadata && doc._metadata.lastUpdatedBy == user) {
			// 	logger.info(`[${txnId}] Self deployment not allowed ::  ${JSON.stringify({ lastUpdatedBy: doc._metadata.lastUpdatedBy, currentUser: user })}`);

			// 	return res.status(403).json({ message: 'You cannot deploy your own changes' });
			// }
		} else {
			logger.debug(`[${txnId}] Process Flow is not in draft status, checking in draft collection :: ${doc.status}`);


			const draftDoc = await draftProcessflowModel.findOne({ _id: id, '_metadata.deleted': false });
			if (!draftDoc) {
				logger.info(`[${txnId}] Process Flow has no draft version for deployment`);

				return res.status(400).json({ message: 'No changes to redeploy' });
			}

			logger.debug(`[${txnId}] Process Flow data found in draft collection`);
			logger.trace(`[${txnId}] Process Flow draft data :: ${JSON.stringify(draftDoc)}`);


			if (verifyDeploymentUser && !isSuperAdmin && draftDoc._metadata && draftDoc._metadata.lastUpdatedBy == user) {
				logger.info(`[${txnId}] Self deployment not allowed :: ${{ lastUpdatedBy: draftDoc._metadata.lastUpdatedBy, currentUser: user }}`);

				return res.status(400).json({ message: 'You cannot deploy your own changes' });
			}


			if (draftDoc && draftDoc.app != doc.app) {
				logger.info(`[${txnId}] App change not permitted`);

				return res.status(400).json({ message: 'App change not permitted' });
			}


			const newFlowObj = draftDoc.toObject();

			delete newFlowObj.__v;
			delete newFlowObj._metadata;
			delete newFlowObj.version;
			
            Object.assign(doc, newFlowObj);
			draftDoc._req = req;
			
            await draftDoc.remove();

            logger.debug(`[${txnId}] Process Flow draft deleted`);
		}


		doc.version = oldFlowObj.version;
		doc.draftVersion = null;
		doc.status = 'Pending';
		doc._req = req;
		doc._oldData = oldFlowObj;
        doc.isNew = false;

		await doc.save();


		if (config.isK8sEnv()) {
            logger.debug(`[${txnId}] On K8s Env, deploying Process Flow :: ${id}`);

			doc.image = processflowBaseImage;
			
            let status = await k8sUtils.upsertService(doc);
			status = await k8sUtils.upsertDeployment(doc);

            if (status.statusCode != 200 && status.statusCode != 202) {
                logger.info(`[${txnId}] Unable to deploy Process Flow :: ${JSON.stringify(status)}`);

				return res.status(status.statusCode).json({ message: 'Unable to deploy Flow' });
			}

            logger.debug(`[${txnId}] Deployment Status :: ${status}`);
		} 


		let eventId = 'EVENT_PROCESS_FLOW_DEPLOY';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


		socket.emit('processFlowStatus', {
			_id: id,
			app: doc.app,
			url: doc.url,
			port: doc.port,
			deploymentName: doc.deploymentName,
			namespace: doc.namespace,
			message: 'Deployed'
		});

        logger.info(`[${txnId}] Deployed Process Flow for ID :: ${id}`);

		return res.status(200).json({ message: 'Process Flow Deployed' });

	} catch (err) {
		logger.error(`[${txnId}] Error deploying Process Flow :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:id/repair', async (req, res) => {
    let txnId = req.get('txnId');
	try {
        let id = req.params.id;
        let socket = req.app.get('socket');


		logger.info(`Process Flow repair API called for ID :: ${id}`);


		const doc = await processflowModel.findById(id).lean();
		if (!doc) {
            logger.info(`[${txnId}] Process Flow data not found for ID :: ${id}`);

			return res.status(400).json({ message: 'Process Flow Not Found.' });
		}


        logger.debug(`[${txnId}] Process Flow data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow data :: ${JSON.stringify(doc)}`);


        doc.status = 'Pending';
		doc.isNew = false;
		doc._req = req;
		await doc.save();


		if (config.isK8sEnv()) {
            logger.debug(`[${txnId}] On K8s Env, deploying Process Flow :: ${id}`);

			doc.image = processflowBaseImage;

			let status = await k8sUtils.deleteDeployment(doc);
			status = await k8sUtils.deleteService(doc);
			status = await k8sUtils.upsertService(doc);
			status = await k8sUtils.upsertDeployment(doc);

			if (status.statusCode !== 200 && status.statusCode !== 202) {
                logger.info(`[${txnId}] Unable to repair Process Flow :: ${JSON.stringify(status)}`);

				return res.status(status.statusCode).json({ message: 'Unable to repair Process Flow' });
			}

            logger.debug(`[${txnId}] Deployment Status :: ${status}`);
		}


		let eventId = 'EVENT_PROCESS_FLOW_REPAIR';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


        socket.emit('processFlowStatus', {
			_id: id,
			app: doc.app,
			url: doc.url,
			port: doc.port,
			deploymentName: doc.deploymentName,
			namespace: doc.namespace,
			message: 'Deployed'
		});

        logger.info(`[${txnId}] Repaired Process Flow for ID :: ${id}`);
		
		return res.status(200).json({ message: 'Process Flow Repaired.' });

	} catch (err) {
		logger.error(`[${txnId}] Error repairing Process Flow :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:id/start', async (req, res) => {
    let txnId = req.get('TxnId');
	try {
		let id = req.params.id;
		let socket = req.app.get('socket');


		logger.info(`[${txnId}] Process Flow start request received for ID :: ${id}`);


		const doc = await processflowModel.findById(id);
		if (!doc) {
            logger.info(`[${txnId}] Process Flow data not found for ID :: ${id}`);

			return res.status(400).json({ message: 'Process Flow Not Found.' });
		}


		logger.debug(`[${txnId}] Process Flow data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow data :: ${JSON.stringify(doc)}`);


		if (doc.status === 'Active') {
			logger.info(`[${txnId}] Process Flow is already running, can't start again.`);

			return res.status(400).json({ message: 'Can\'t restart a running Process Flow' });
		}


        doc.status = 'Pending';
		doc.isNew = false;
		doc._req = req;
		await doc.save();


		if (config.isK8sEnv()) {
            logger.debug(`[${txnId}] On K8s Env, scaling up deployment of Process Flow :: ${doc.deploymentName}`);

			const status = await k8sUtils.scaleDeployment(doc, 1);

			if (status.statusCode !== 200 && status.statusCode !== 202) {
                logger.info(`[${txnId}] Unable to scale up Process Flow :: ${JSON.stringify(status)}`);

				return res.status(status.statusCode).json({ message: 'Unable to start Process Flow' });
			}

            logger.debug(`[${txnId}] Deployment status :: ${JSON.stringify(status)}`);
		}

		
		let eventId = 'EVENT_PROCESS_FLOW_START';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


		socket.emit('processFlowStatus', {
			_id: id,
			app: doc.app,
			url: doc.url,
			port: doc.port,
			deploymentName: doc.deploymentName,
			namespace: doc.namespace,
			message: 'Started'
		});

        logger.info(`[${txnId}] Started Process Flow for ID :: ${id}`);

		return res.status(200).json({ message: 'Process Flow Started.' });

	} catch (err) {
		logger.error(`[${txnId}] Error starting Process Flow :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/:id/stop', async (req, res) => {
    let txnId = req.get('TxnId');
	try {
		let id = req.params.id;
		let socket = req.app.get('socket');


		logger.info(`[${txnId}] Process Flow stop request received for ID :: ${id}`);


		const doc = await processflowModel.findById(id);
		if (!doc) {
            logger.info(`[${txnId}] Process Flow data not found for ID :: ${id}`);

			return res.status(400).json({ message: 'Process Flow Not Found.' });
		}


		logger.debug(`[${txnId}] Process Flow data found for id :: ${id}`);
		logger.trace(`[${txnId}] Process Flow data :: ${JSON.stringify(doc)}`);


		if (doc.status !== 'Active') {
			logger.debug(`[${txnId}] Process Flow is not running, can't stop again.`);

			return res.status(400).json({ message: 'Can\'t stop an inactive flow.' });
		}


        doc.status = 'Stopped';
		doc.isNew = false;
		doc._req = req;
		await doc.save();


		if (config.isK8sEnv()) {
            logger.debug(`[${txnId}] On K8s Env, scaling down deployment of Process Flow :: ${JSON.stringify({ namespace: doc.namespace, deploymentName: doc.deploymentName })}`);

			const status = await k8sUtils.scaleDeployment(doc, 0);
			
            if (status.statusCode !== 200 && status.statusCode !== 202) {
                logger.info(`[${txnId}] Unable to scale down Process Flow :: ${JSON.stringify(status)}`);
			
				return res.status(status.statusCode).json({ message: 'Unable to stop Process Flow.' });
			}

            logger.debug(`[${txnId}] Deployment status :: ${JSON.stringify(status)}`);
		}


		let eventId = 'EVENT_PROCESS_FLOW_STOP';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


		socket.emit('processFlowStatus', {
			_id: id,
			app: doc.app,
			url: doc.url,
			port: doc.port,
			deploymentName: doc.deploymentName,
			namespace: doc.namespace,
			message: 'Stopped'
		});

		logger.info(`[${txnId}] Stopped Process Flow for ID :: ${id}`);

		return res.status(200).json({ message: 'Process Flow Stopped.' });
	} catch (err) {
		logger.error(`[${txnId}] Error stopping Process Flow :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.put('/startAll', async (req, res) => {
    let txnId = req.get('TxnId');
	try {
		let app = req.params.app;
		let socket = req.app.get('socket');


		logger.info(`[${txnId}] Start All Process Flows request received for app :: ${app}`);


		const docs = await processflowModel.find({ 'app': app, 'status': 'Stopped' });
		if (!docs) {
            logger.info(`[${txnId}] No Stopped Process Flow found for app :: ${app}`);

			return res.status(200).json({ message: 'No Process Flows to Start.' });
		}


		logger.debug(`[${txnId}] Process Flows found for app :: ${app} :: ${docs.length}`);
		logger.trace(`[${txnId}] Process Flows data :: ${JSON.stringify(docs)}`);


		let promises = docs.map(async doc => {

            doc.status = 'Pending';
			doc.isNew = false;
			doc._req = req;
			await doc.save();


			if (config.isK8sEnv()) {
                logger.debug(`[${txnId}] On K8s Env, scaling down deployment of Process Flow :: ${JSON.stringify({ namespace: doc.namespace, deploymentName: doc.deploymentName })}`);

				const status = await k8sUtils.scaleDeployment(doc, 1);

				if (status.statusCode !== 200 && status.statusCode !== 202) {
                    logger.info(`[${txnId}] Unable to scale up Process Flow for ID :: ${doc._id} :: ${JSON.stringify(status)}`);

					return status;
				}

                logger.trace(`[${txnId}] Deployment Scaled status :: ${JSON.stringify(status)}`);
			}

			
			let eventId = 'EVENT_PROCESS_FLOW_START';
			logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
			dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


			socket.emit('processFlowStatus', {
				_id: doc._id,
				app: app,
				url: doc.url,
				port: doc.port,
				deploymentName: doc.deploymentName,
				namespace: doc.namespace,
				message: 'Started'
			});
		});


		res.status(202).json({ message: 'Request to start all Process Flows has been received' });
		return Promise.all(promises);

	} catch (err) {
		logger.error(`[${txnId}] Error starting all Process Flows :: ${err.message || err}`);

		if (!res.headersSent) {
			if (typeof err === 'string') {
				return res.status(500).json({
					message: err
				});
			}
			return res.status(500).json({
				message: err.message
			});
		}
	}
});


router.put('/stopAll', async (req, res) => {
    let txnId = req.get('TxnId');
	try {
		let app = req.params.app;
		let socket = req.app.get('socket');

        
		logger.info(`[${txnId}] Stop all Process Flows request received for app :: ${app}`);


		const docs = await processflowModel.find({ 'app': app, 'status': 'Active' });
		if (!docs) {
			logger.info(`[${txnId}] No Running Process Flow found for app :: ${app}`);

			return res.status(200).json({ message: 'No Process Flows to Stop.' });
		}


		logger.debug(`[${txnId}] Process Flows found for app :: ${app} :: ${docs.length}`);
		logger.trace(`[${txnId}] Process Flows data :: ${JSON.stringify(docs)}`);


		let promises = docs.map(async doc => {

			doc.status = 'Stopped';
			doc.isNew = false;
			doc._req = req;
			await doc.save();


			if (config.isK8sEnv()) {
				logger.debug(`[${txnId}] On K8s Env, scaling down deployment of Process Flow :: ${JSON.stringify({ namespace: doc.namespace, deploymentName: doc.deploymentName })}`);
				
				const status = await k8sUtils.scaleDeployment(doc, 0);

				if (status.statusCode !== 200 && status.statusCode !== 202) {
					logger.info(`[${txnId}] Unable to scale down Process Flow for ID :: ${doc._id} :: ${JSON.stringify(status)}`);
					
					return status;
				}

				logger.trace(`[${txnId}] Deployment Scaled status :: ${JSON.stringify(status)}`);
			}


			let eventId = 'EVENT_PROCESS_FLOW_STOP';
			logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
			dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc, null);


			socket.emit('processFlowStatus', {
				_id: doc._id,
				app: app,
				url: doc.url,
				port: doc.port,
				deploymentName: doc.deploymentName,
				namespace: doc.namespace,
				message: 'Stopped'
			});
		});


		res.status(202).json({ message: 'Request to stop all flows has been received.' });
		return Promise.all(promises);

	} catch (err) {
		logger.error(`[${txnId}] Error starting all Process Flows :: ${err.message || err}`);

		if (!res.headersSent) {
			if (typeof err === 'string') {
				return res.status(500).json({
					message: err
				});
			}
			return res.status(500).json({
				message: err.message
			});
		}
	}
});


router.put('/:id/draftDelete', async (req, res) => {
	let txnId = req.get('TxnId');
	try {
		let id = req.params.id;
		

		logger.info(`[${txnId}] Process Flow draft delete request received :: ${id}`);


		let doc = await flowModel.findById(id);
		if (!doc) {
			logger.info(`[${txnId}] Process Flow data not found for ID :: ${id}`);

			return res.status(404).json({ message: 'Process Flow Not Found.' });
		}


		let draftDoc = await draftFlowModel.findById(id);
		if (!draftDoc) {
			logger.info(`[${txnId}] Process Flow draft data not found for ID :: ${id}`);

			return res.status(404).json({ message: 'Draft not found for ' + id });
		}


		logger.debug(`[${txnId}] Process Flow draft data found for ID :: ${id}`);
		logger.trace(`[${txnId}] Process Flow draft data :: ${JSON.stringify(draftDoc)}`);


		draftDoc._req = req;
		await draftDoc.remove();

		doc.draftVersion = null;
		doc._req = req;
		await doc.save();


		logger.trace(`[${txnId}] Updated Process Flow data :: ${JSON.stringify(doc)}`);

		
		let eventId = 'EVENT_PROCESS_FLOW_DELETE_DRAFT';
		logger.debug(`[${txnId}] Publishing Event :: ${eventId}`);
		dataStackUtils.eventsUtil.publishEvent(eventId, 'processFlow', req, doc);


		logger.info(`Process Flow draft data deleted for ID :: ${id}`);

		return res.status(200).json({ message: 'Draft deleted for ' + id });

	} catch (err) {
		logger.error(`[${txnId}] Error deleting draft Process Flow for ID :: ${id} :: ${err.message || err}`);

		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		return res.status(500).json({
			message: err.message
		});
	}
});


router.get('/:id/yamls', async (req, res) => {
	try {
		const doc = await processflowModel.findById(req.params.id);

		const namespace = (config.DATA_STACK_NAMESPACE + '-' + doc.app).toLowerCase();
		const port = doc.port || 31000;
		const name = doc.deploymentName;
		const envKeys = [
			'FQDN', 
			'LOG_LEVEL', 
			'MONGO_APPCENTER_URL', 
			'MONGO_AUTHOR_DBNAME', 
			'MONGO_AUTHOR_URL', 
			'MONGO_LOGS_DBNAME', 
			'MONGO_LOGS_URL', 
			'MONGO_RECONN_TIME', 
			'MONGO_RECONN_TRIES', 
			'STREAMING_CHANNEL', 
			'STREAMING_HOST', 
			'STREAMING_PASS', 
			'STREAMING_RECONN_ATTEMPTS', 
			'STREAMING_RECONN_TIMEWAIT', 
			'STREAMING_USER', 
			'DATA_STACK_NAMESPACE', 
			'CACHE_CLUSTER', 
			'CACHE_HOST', 
			'CACHE_PORT', 
			'CACHE_RECONN_ATTEMPTS', 
			'CACHE_RECONN_TIMEWAIT_MILLI', 
			'RELEASE', 
			'TLS_REJECT_UNAUTHORIZED', 
			'API_REQUEST_TIMEOUT'
		];
		const envVars = [];
		envKeys.forEach(key => {
			envVars.push({ name: key, value: process.env[key] });
		});
		envVars.push({ name: 'DATA_STACK_APP_NS', value: namespace });
		// envVars.push({ name: 'NODE_OPTIONS', value: `--max-old-space-size=${config.maxHeapSize}` });
		// envVars.push({ name: 'NODE_ENV', value: 'production' });
		envVars.push({ name: 'DATA_STACK_PROCESS_FLOW_ID', value: `${doc._id}` });
		envVars.push({ name: 'DATA_STACK_APP', value: `${doc.app}` });

		const options = {
			startupProbe: {
				httpGet: {
					path: '/api/b2b/internal/health/ready',
					port: +(port || 8080),
					scheme: 'HTTP'
				},
				initialDelaySeconds: 5,
				timeoutSeconds: 30,
				periodSeconds: 10,
				failureThreshold: 5
			}
		};

		const deployData = {
			apiVersion: 'apps/v1',
			kind: 'Deployment',
			metadata: {
				name: name,
				namespace: namespace
			},
			spec: {
				replicas: 1,
				selector: {
					matchLabels: {
						app: name
					}
				},
				template: {
					metadata: {
						labels: {
							app: name
						}
					},
					spec: {
						containers: [
							{
								name: name,
								image: processflowBaseImage,
								ports: [
									{
										containerPort: port
									}
								],
								env: envVars
							}
						]
					}
				}
			}
		};
		if (options.livenessProbe) deployData.spec.template.spec.containers[0]['livenessProbe'] = options.livenessProbe;
		if (options.readinessProbe) deployData.spec.template.spec.containers[0]['readinessProbe'] = options.readinessProbe;
		if (options.readinessProbe) deployData.spec.template.spec.containers[0]['startupProbe'] = options.startupProbe;

		const serviceData = {
			apiVersion: 'v1',
			kind: 'Service',
			metadata: {
				name: name,
				namespace: namespace
			},
			spec: {
				type: 'ClusterIP',
				selector: {
					app: name
				},
				ports: [
					{
						protocol: 'TCP',
						port: 80,
						targetPort: port
					}
				]
			}
		};

		const serviceText = yamljs.stringify(serviceData);
		const deploymentText = yamljs.stringify(deployData);

		return res.status(200).json({ service: serviceText, deployment: deploymentText });

	} catch (err) {
		logger.error(err);
		
		return res.status(500).json({ message: err.message });
	}
});


module.exports = router;
