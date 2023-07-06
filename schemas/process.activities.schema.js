const definition = {
	'_id': {
		'type': 'String',
		'default': null
	},
	'app': {
		'type': 'String',
		'required': true
	},
	'flowId': {
		'type': 'String',
		'required': true
	},
	'headers': {
		'type': 'Object',
	},
	'name': {
		'type': 'String'
	},
	'status': {                          //Internal
		'type': 'String',
		'enum': ['PENDING', 'ERROR', 'FAILED', 'SUCCESS', 'UNKNOWN'],
		'default': 'PENDING'
	},
	'payloadMetaData': {
		'type': 'Object'
	},
	'_metadata': {
		'type': {
			'version': {
				'type': {
					'release': { 'type': 'String' }
				}
			},
			'lastUpdatedBy': { 'type': 'String' }
		}
	}
};


module.exports.definition = definition;
