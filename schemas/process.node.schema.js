const definition = {
	'_id': {
		'type': 'String'
	},
	'name': {
		'type': 'String'
	},
	'app': {
		'type': 'String'
	},
	'version': {
		'type': 'Number',
		'default': 1
	},
	'icon': {
		'type': 'String'
	},
	'color': {
		'type': 'String'
	},
	'type': {
		'type': 'String'
	},
	'dataStructure': [
		{
			'id': {
				'type': 'String'
			}
		}
	],
	'api': {
		'method': {
			'type': 'String'
		},
		'endpoint': {
			'type': 'String'
		},
		'contentType': {
			'type': 'String'
		},
		'timeout': {
			'type': 'Number',
			'default': 60000
		},
		'retryCount': {
			'type': 'Number',
			'default': 5
		},
		'retryInterval': {
			'type': 'Number'
		},
	}
};


module.exports.definition = definition;
