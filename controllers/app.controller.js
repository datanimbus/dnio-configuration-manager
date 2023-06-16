const router = require('express').Router();

const indexUtils = require('../utils/indexes.utils');


let logger = global.logger;


router.post('/', async (req, res) => {
	try {
		const app = req.body.app;
		if (!app) {
			return res.status(400).json({ message: 'App is required' });
		}
		await indexUtils.createInteractoionUniqueIndexForApp(app);
		res.status(200).json({ message: 'Create process acknowledged' });
	} catch (err) {
		logger.error(err);
		if (typeof err === 'string') {
			return res.status(500).json({
				message: err
			});
		}
		res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
