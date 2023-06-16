if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const express = require('express');
const socket = require('socket.io');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

const config = require('./config');


require('./db-factory');


const app = express();
const logger = global.logger;
global.activeRequest = 0;


function initSocket(server) {
	const io = socket(server);
	app.set('socket', io);
	global.socket = io;
	logger.info('Initializing socket connection');
	io.on('connection', function (socket) {
		logger.info('Connection accepted from : ' + socket.id);
	});
}


app.use((req, res, next) => {
	if (req.path.split('/').indexOf('live') == -1 && req.path.split('/').indexOf('ready') == -1) {
		logger.info(req.method, req.path, req.query);
		logger.trace(`[${req.get(global.txnIdHeader)}] req.path : ${req.path}`);
		logger.trace(`[${req.get(global.txnIdHeader)}] req.headers : ${JSON.stringify(req.headers)} `);
	}
	global.activeRequest++;
	res.on('close', function () {
		global.activeRequest--;
		if (req.path.split('/').indexOf('live') == -1 && req.path.split('/').indexOf('ready') == -1) {
			logger.debug(`[${req.get(global.txnIdHeader)}] Request completed for ${req.originalUrl}`);
		}
	});
	next();
});


app.use(['/b2b/pipes'], (req, res, next) => {
	let urlSplit = req.path.split('/');

	if (urlSplit[1] && !urlSplit[1].match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]+$/)) {
		return next(new Error('APP_NAME_ERROR :: App name must consist of alphanumeric characters or \'-\' , and must start and end with an alphanumeric character.'));
	}
	if (urlSplit[2] && !urlSplit[2].match(/^[a-zA-Z][a-zA-Z0-9]*$/)) {
		return next(new Error('FLOW_NAME_ERROR :: Flow name must consist of alphanumeric characters, and must start with an alphabet.'));
	}

	if (!global.activeFlows[req.path]) {
		return res.status(404).json({ message: 'Flow is not running' });
	}

	let skipAuth = global.activeFlows[req.path].skipAuth;
	if (!skipAuth) {
		return require('./utils/flow.auth')(req, res, next);
	}
	next();
}, require('./routers/router'));


app.use(['/process/flows'], (req, res, next) => {
	let urlSplit = req.path.split('/');

	if (urlSplit[1] && !urlSplit[1].match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]+$/)) {
		return next(new Error('APP_NAME_ERROR :: App name must consist of alphanumeric characters or \'-\' , and must start and end with an alphanumeric character.'));
	}
	if (urlSplit[2] && !urlSplit[2].match(/^[a-zA-Z][a-zA-Z0-9]*$/)) {
		return next(new Error('PROCESS_FLOW_NAME_ERROR :: Process Flow name must consist of alphanumeric characters, and must start with an alphabet.'));
	}

	if (!global.activeProcessFlows[req.path]) {
		return res.status(404).json({ message: 'Process Flow is not running.' });
	}

	let skipAuth = global.activeProcessFlows[req.path].skipAuth;
	if (!skipAuth) {
		return require('./utils/process.flow.auth')(req, res, next);
	}
	next();
}, require('./routers/process.router'));


app.use(express.json({ inflate: true, limit: config.MAX_JSON_SIZE }));
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: ['application/xml', 'text/xml', 'application/octet-stream'] }));
app.use(cookieParser());


app.use(fileUpload({
	useTempFiles: true,
	tempFileDir: './uploads'
}));

app.use(['/cm', '/b2b/cm'], require('./utils/auth'), require('./controllers'));

app.use(function (error, req, res, next) {
	if (error) {
		logger.error(error);
		if (!res.headersSent) {
			let statusCode = error.statusCode || 500;
			if (error?.message?.includes('APP_NAME_ERROR') ||
				error?.message?.includes('FLOW_NAME_ERROR') ||
				error?.message?.includes('FAAS_NAME_ERROR') ||
				error?.message?.includes('WORKFLOW_NAME_ERROR')) {

				statusCode = 400;
			}
			res.status(statusCode).json({
				message: error.message
			});
		}
	} else {
		next();
	}
});


const server = app.listen(config.port, () => {
	logger.info('HTTP Server is listening on:', config.port);
});


initSocket(server);


process.on('SIGTERM', () => {
	try {
		// Handle Request for 15 sec then stop recieving
		setTimeout(() => {
			global.stopServer = true;
		}, 15000);
		logger.info('Process Kill Request Recieved');
		const intVal = setInterval(() => {
			// Waiting For all pending requests to finish;
			if (global.activeRequest === 0) {
				server.close(() => {
					logger.info('HTTP Server Stopped.');
					process.exit(0);
				});
				clearInterval(intVal);
			} else {
				logger.info('Waiting for request to complete, Active Requests:', global.activeRequest);
			}
		}, 2000);
	} catch (e) {
		logger.error('SIGTERM Handler', e);
		process.exit(0);
	}
});
