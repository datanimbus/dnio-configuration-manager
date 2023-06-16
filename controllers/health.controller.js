const mongoose = require('mongoose');
const router = require('express').Router();

const client = require('../queue').getClient();


let logger = global.logger;


router.get('/live', async (req, res) => {
	try {
		return res.status(200).json({ message: '' });
	} catch (err) {
		logger.error(err);
		res.status(500).json({
			message: err.message
		});
	}
});


router.get('/ready', async (req, res) => {
	try {
		if (mongoose.connection.readyState === 1 && client && client.nc && client.nc.connected) {
			return res.status(200).json({ message: '' });
		} else {
			return res.status(400).json({ message: '' });
		}
	} catch (err) {
		logger.error(err);
		res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
