// @ts-check
'use strict';

const Twit = require('twit');
const helpers = require('twit/lib/helpers');
const xmlparser = require('fast-xml-parser');

/**
 * @typedef {Object.<string, string>} TwitterConfig
 * @property {string} consumerKey
 * @property {string} consumerSecret
 * @property {string} accessToken
 * @property {string} accessTokenSecret
 */

/**
 * @param {TwitterConfig} config
 */
module.exports = ({consumerKey, consumerSecret, accessToken, accessTokenSecret,}) => {

    /**
     *
     * @param {Object} options
     * @param {string?} options.oauth_callback
     * @param {"read" | "write"=} options.x_auth_access_type
     * @returns {Promise<{
     *   oauth_token: string,
     *   oauth_token_secret: string,
     *   oauth_callback_confirmed: boolean
     * }>}
     */
    const getRequestToken = ({oauth_callback, x_auth_access_type}) => {
        const t = new Twit({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            access_token: accessToken,
            access_token_secret: accessTokenSecret,
        });

        t._doRestApiRequest = (reqOpts, twitOptions, method, callback) => {
            if (oauth_callback) {
                reqOpts.oauth.callback = oauth_callback; // Add the extra OAuth parameter
            }
            if (x_auth_access_type) {
                reqOpts.form = {x_auth_access_type};
            }

            const requestMethod = require('request')[method.toLowerCase()];
            const req = requestMethod(reqOpts);

            let body = '';
            let response = null;

            const onRequestEnd = () => {
                if (response && response.statusCode > 200) {
                    const err = helpers.makeTwitError('Twitter API Error')
                    err.statusCode = response ? response.statusCode : null;
                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(body);
                        helpers.attachBodyInfoToError(err, parsedBody);
                    } catch (e) {
                        parsedBody = xmlparser.parse(body, {
                            ignoreAttributes : false,
                            textNodeName: "message",
                            attributeNamePrefix : "",
                        });
                        err.message = parsedBody.errors.error.message;
                        err.code = parsedBody.errors.error.code;
                        err.twitterReply = parsedBody;
                        err.allErrors = err.allErrors.concat(parsedBody.errors)
                    }
                    return callback(err, parsedBody, response);
                }

                /**
                 * @type {{
                 *   oauth_token: string,
                 *   oauth_token_secret: string,
                 *   oauth_callback_confirmed: boolean
                 * }}
                 */
                let parsedBody = null;
                if (body !== '') {
                    // @ts-ignore
                    parsedBody = require('querystring').decode(body);
                    // @ts-ignore
                    parsedBody.oauth_callback_confirmed = parsedBody.oauth_callback_confirmed === 'true';
                }

                // success case - no errors in HTTP response body
                callback(null, parsedBody || body, response)
            }

            req.on('response', function onRequestResponse(res) {
                response = res
                // read data from `request` object which contains the decompressed HTTP response body,
                // `response` is the unmodified http.IncomingMessage object which may contain compressed data
                req.on('data', function onRequestData(chunk) {
                    body += chunk.toString('utf8')
                })
                // we're done reading the response
                req.on('end', onRequestEnd);
            })

            req.on('error', function onRequestError(err) {
                // transport-level error occurred - likely a socket error
                // pass the transport-level error to the caller
                err.statusCode = null
                err.message = body;
                err.code = null
                err.allErrors = [];
                helpers.attachBodyInfoToError(err, body)
                callback(err, body, response);
                return;
            })
        }

        return t.post("https://api.twitter.com/oauth/request_token")
            .then(r => r.data);
    };

    return {
        getRequestToken,
    };
};