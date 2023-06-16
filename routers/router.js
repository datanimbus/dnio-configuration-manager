const url = require('url');
const { v4: uuid } = require('uuid');
const proxy = require('express-http-proxy');
const router = require('express').Router({ mergeParams: true });

const flowUtils = require('../utils/flow.utils');
const routerUtils = require('../utils/router.utils');


let logger = global.logger;


routerUtils.initRouterMap();


router.use('/:app/:api(*)?', async (req, res, next) => {
	try {
		const path = '/' + req.params.app + '/' + req.params.api;

		logger.debug('Looking for path in map:', path, global.activeFlows[path]);

		if (!global.activeFlows[path]) {
			return res.status(400).json({ message: `No Data Pipes with path ${path} Found` });
		}
		
		const headers = JSON.parse(JSON.stringify(req.headers));
		let txnId = uuid().split('-');
		
		headers['data-stack-txn-id'] = `${txnId[1]}${txnId[2]}`;
		if (!req.header('data-stack-remote-txn-id')) {
			headers['data-stack-remote-txn-id'] = uuid();
		}
		
		delete headers['cookie'];
		delete headers['host'];
		delete headers['connection'];
		delete headers['user-agent'];
		delete headers['content-length'];

		const routeData = global.activeFlows[path];
		if (!routeData || !routeData.proxyHost || !routeData.proxyPath) {
			return res.status(404).json({ message: 'No Route Found' });
		}
		
		const result = await flowUtils.createInteraction(req, { flowId: routeData.flowId });
		
		const proxyHost = routeData.proxyHost;
		let proxyPath;
		
		if (Object.keys(req.query).length > 0) {
			const urlParsed = url.parse(req.url, true);
			logger.trace('URL parsed with query params - ', urlParsed.search);
			proxyPath = routeData.proxyPath + urlParsed.search + '&interactionId=' + result._id;
		} else {
			proxyPath = routeData.proxyPath + '?interactionId=' + result._id;
		}
		
		logger.info('Proxying request to: ', proxyHost + proxyPath);
		
		proxy(proxyHost, {
			memoizeHost: false,
			parseReqBody: false,
			preserveHostHdr: true,
			proxyReqPathResolver: function () {
				return proxyPath;
			}
		})(req, res, next);
		
	} catch (err) {
		let statusCode = err.statusCode ? err.statusCode : 500;
		let responseBody;

		if (err.body) {
			responseBody = err.body;
		} else if (err.message) {
			responseBody = { message: err.message };
		} else {
			responseBody = err;
		}
		logger.error(err);
		
		res.status(statusCode).json(responseBody);
	}
});


module.exports = router;
