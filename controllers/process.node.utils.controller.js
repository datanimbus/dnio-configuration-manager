const mongoose = require('mongoose');
const router = require('express').Router({ mergeParams: true });

const queryUtils = require('../utils/query.utils');


let logger = global.logger;

const nodeModel = mongoose.model('process.nodes');


router.get('/count', async (req, res) => {
	let txnId = req.get('txnId');
	try {
		logger.info(`[${txnId}] Count Process Flow Nodes request received.`);
        logger.debug(`[${txnId}] Query Filters received :: ${JSON.stringify(req.query.filter)}`);


		const filter = queryUtils.parseFilter(req.query.filter);
		if (filter) {
			filter.app = req.locals.app;
		}
        logger.debug(`[${txnId}] Parsed Filters :: ${JSON.stringify(filter)}`);


		const count = await nodeModel.countDocuments(filter);

		logger.info(`[${txnId}] Process Flow Node count :: ${count}`);

		return res.status(200).json(count);

	} catch (err) {
		logger.error(`[${txnId}] Error fetching count of Process Flows :: ${err.message || err}`);

		return res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
