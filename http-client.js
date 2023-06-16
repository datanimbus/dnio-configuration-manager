const got = require('got');


async function httpRequest(options) {
    try {
        if (!options) {
            options = {};
        }
        if (!options.method) {
            options.method = 'GET';
        }
        options.responseType = 'json';
        
        const resp = await got(options);
        return { statusCode: resp.statusCode, body: resp.body };
    } catch (err) {
        if (err.response) {
            throw { statusCode: err.response.statusCode, body: err.response.body };
        } else {
            throw { statusCode: 500, body: err };
        }
    }
}


module.exports.httpRequest = httpRequest;
