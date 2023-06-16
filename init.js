const path = require('path');
const log4js = require('log4js');
const mkdirp = require('mkdirp');
const cron = require('node-cron');
const JWT = require('jsonwebtoken');
const mongoose = require('mongoose');

const config = require('./config');


// const logger = log4js.getLogger(global.loggerName);
let logger = global.logger;


function init() {
	const token = JWT.sign({ name: 'DS_CONFIG_MANAGER', _id: 'admin', isSuperAdmin: true }, config.RBAC_JWT_KEY);
	global.CM_TOKEN = token;

	const folderPath = process.cwd();
	mkdirp.sync(path.join(folderPath, 'downloads'));

	// agentStatusCron();
}


function agentStatusCron() {
	const agentModel = mongoose.model('agent');
	const agentActionModel = mongoose.model('agent-action');

	if (config.hbMissCount < 1) {
		config.hbMissCount = 1;
	}

	cron.schedule('*/2 * * * *', function () {

		logger.info('Running cron to update agent status');

		let dateFilter = new Date();
		logger.trace('New Date - ', dateFilter);
		
		dateFilter.setSeconds(config.hbFrequency * config.hbMissCount * -1);
		logger.trace('Date ', dateFilter);

		let findFilter = { status: { '$nin': ['STOPPED', 'DISABLED'] }, '_metadata.lastUpdated': { '$lte': dateFilter } };
		logger.trace('findFilter', JSON.stringify(findFilter));
		
		return agentModel.find(findFilter).lean()
			.then(agents => {
				if (agents && agents.length > 0) {
					agents.forEach(agent => {
						const actionDoc = new agentActionModel({
							agentId: agent.agentId,
							action: 'AGENT_STOPPED'
						});
						let status = actionDoc.save();
						logger.trace('Agent Status Updated - ', JSON.stringify(status));
					});
				}
			}).then(() => {
				return agentModel.updateMany({ status: { '$nin': ['STOPPED', 'DISABLED'] }, '_metadata.lastUpdated': { '$lte': dateFilter } }, { $set: { status: 'STOPPED', '_metadata.lastUpdated': new Date() } }, { multi: true });
			})
			.then((_d) => {
				logger.debug('Agent status cron result - ' + JSON.stringify(_d));
			})
			.catch(err => {
				logger.error(err);
			});
	});
}


module.exports.init = init;
