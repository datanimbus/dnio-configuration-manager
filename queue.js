const mongoose = require('mongoose');
const NATS = require('node-nats-streaming');

const config = require('./config');


const logger = global.logger
const streamingConfig = config.streamingConfig;
const clusterName = process.env.STREAMING_CHANNEL || 'datastack-cluster';
const clientId = `${process.env.HOSTNAME || 'CONFIG-MANAGER'}` + Math.floor(Math.random() * 10000);


let client;


function init() {
	if (!client) {
		logger.trace(`clusterName: ${clusterName}, clientId: ${clientId}, streamingConfig: ${JSON.stringify(streamingConfig)}`);
		client = NATS.connect(clusterName, clientId, streamingConfig);
		
		client.on('error', function (err) {
			logger.error(err);
		});

		client.on('connect', function () {
			logger.info('Connected to streaming server');
			// faasInvokeLogger();
		});

		client.on('disconnect', function () {
			logger.info('Disconnected from streaming server');
		});

		client.on('reconnecting', function () {
			logger.info('Reconnecting to streaming server');
			// faasInvokeLogger();
		});

		client.on('reconnect', function () {
			logger.info('Reconnected to streaming server');
		});

		client.on('close', function () {
			logger.info('Connection closed to streaming server');
		});
	}
	return client;
}


function faasInvokeLogger() {
	let opts = client.subscriptionOptions();
	opts.setStartWithLastReceived();
	opts.setDurableName('faas-durable');

	let subscription = client.subscribe(config.faasLastInvokedQueue, 'faas', opts);
	subscription.on('message', async function (_body) {
		try {
			const faasModel = mongoose.model('faas');
			
			let bodyObj = JSON.parse(_body.getData());
			logger.trace(`Message from queue :: ${config.faasLastInvokedQueue} :: ${JSON.stringify(bodyObj)}`);
			
			const timestamp = new Date(bodyObj.startTime);
			await faasModel.findOneAndUpdate({ _id: bodyObj._id }, { $set: { lastInvoked: timestamp } });
		} catch (err) {
			logger.error('Error updating function lastInvokedTime :: ', err);
		}
	});
}


function sendToQueue(data) {
	client.publish(config.queueName, JSON.stringify(data));
}


module.exports = {
	init: init,
	sendToQueue: sendToQueue,
	getClient: function () {
		return client;
	}
};
