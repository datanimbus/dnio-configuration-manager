const mongoose = require('mongoose');

const config = require('../config');


const logger = global.logger;

const flowModel = mongoose.model('flow');
const processflowModel = mongoose.model('process.flows');


async function initRouterMap() {
	try {
		logger.info(`Creating data pipes routing map.`);

		const flows = await flowModel.find({status: 'Active'}).lean();

		global.activeFlows = {};
		
		flows.forEach(item => {
			if (config.isK8sEnv()) {
				global.activeFlows['/' + item.app + item.inputNode.options.path] = {
					proxyHost: `http://${item.deploymentName}.${item.namespace}`,
					proxyPath: '/api/b2b/' + item.app + item.inputNode.options.path,
					flowId: item._id,
					skipAuth: item.skipAuth || false
				};
			} else {
				global.activeFlows['/' + item.app + item.inputNode.options.path] = {
					proxyHost: 'http://localhost:8080',
					proxyPath: '/api/b2b/' + item.app + item.inputNode.options.path,
					flowId: item._id,
					skipAuth: item.skipAuth || false
				};
			}
		});

		logger.info(`Active Data Pipes count :: ${global.activeFlows.length || 0}`);
		logger.trace(`Active Data Pipes :: ${JSON.stringify(global.activeFlows)}`);
		
	} catch (err) {
		logger.error(`Error creating active Data Pipes routing map :: ${err}`);
	}
}


async function initProcessFlowRouterMap() {
	try {
		logger.info(`Creating process flows routing map.`);

		const flows = await processflowModel.find({status: 'Active'}).lean();

		global.activeProcessFlows = {};
		
		flows.forEach(item => {
			if (config.isK8sEnv()) {
				global.activeProcessFlows['/' + item.app + item.inputNode.options.path] = {
					proxyHost: `http://${item.deploymentName}.${item.namespace}`,
					proxyPath: '/api/flows/' + item.app + item.inputNode.options.path,
					flowId: item._id,
					skipAuth: item.skipAuth || false
				};
			} else {
				global.activeProcessFlows['/' + item.app + item.inputNode.options.path] = {
					proxyHost: `http://localhost:${item.port || 31000}`,
					proxyPath: '/api/flows/' + item.app + item.inputNode.options.path,
					flowId: item._id,
					skipAuth: item.skipAuth || false
				};
			}
		});

		logger.info(`Active Process Flows count :: ${Object.keys(global.activeProcessFlows).length || 0}`);
		logger.trace(`Active Process Flows :: ${JSON.stringify(global.activeProcessFlows)}`);

	} catch (err) {
		logger.error(`Error creating active Process Flows routing map :: ${err}`);
	}
}


module.exports.initRouterMap = initRouterMap;
module.exports.initProcessFlowRouterMap = initProcessFlowRouterMap;
