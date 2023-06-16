const mongoose = require('mongoose');
const router = require('express').Router({ mergeParams: true });


let logger = global.logger;
const configModel = mongoose.model('b2b.category');


router.get('/category', async (req, res) => {
	try {
		const docs = await configModel.find().toArray();
		return res.status(200).json(docs);
	} catch (err) {
		logger.error(err);
		res.status(500).json({
			message: err.message
		});
	}
});


module.exports = router;
