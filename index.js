'use strict';

const Twit = require('twit');
const helpers = require('twit/lib/helpers');
const xmlparser = require('fast-xml-parser');

/**
 * @typedef {Object.<string, string>} TwitterAppConfig
 * @property {string} consumerKey
 * @property {string} consumerSecret
 * @property {string} accessToken
 * @property {string} accessTokenSecret
 */

/**
 * @param {TwitterAppConfig} config
 */
module.exports = ({consumerKey, consumerSecret, accessToken, accessTokenSecret,}) => {

    /**
     *
     * @param {Object} options
     * @param {string=} options.oauth_callback
     * @param {"read" | "write"=} options.x_auth_access_type
     * @returns {Promise<{
     *   oauth_token: string,
     *   oauth_token_secret: string,
     *   oauth_callback_confirmed: boolean
     * }>}
     */
    const getRequestToken = ({oauth_callback, x_auth_access_type} = {}) => {
        const t = new Twit({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            app_only_auth: true
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
                    const err = helpers.makeTwitError('Twitter API Error');
                    err.statusCode = response ? response.statusCode : null;
                    /**
                     * @type {Object<string, ?>}
                     */
                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(body);
                        helpers.attachBodyInfoToError(err, parsedBody);
                    } catch (e) {
                        parsedBody = xmlparser.parse(body, {
                            ignoreAttributes: false,
                            textNodeName: "message",
                            attributeNamePrefix: "",
                        });
                        err.message = parsedBody.errors.error.message;
                        err.code = parsedBody.errors.error.code;
                        err.twitterReply = parsedBody;
                        err.allErrors = err.allErrors.concat(parsedBody.errors);
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
                let parsedBody;
                if (body !== '') {
                    // @ts-ignore
                    parsedBody = require('querystring').decode(body);
                    // @ts-ignore
                    parsedBody.oauth_callback_confirmed = parsedBody.oauth_callback_confirmed === 'true';
                }

                // success case - no errors in HTTP response body
                callback(null, parsedBody || body, response)
            };

            req.on('response', function onRequestResponse(res) {
                response = res;
                // read data from `request` object which contains the decompressed HTTP response body,
                // `response` is the unmodified http.IncomingMessage object which may contain compressed data
                req.on('data', function onRequestData(chunk) {
                    body += chunk.toString('utf8')
                });
                // we're done reading the response
                req.on('end', onRequestEnd);
            });

            req.on('error', function onRequestError(err) {
                // transport-level error occurred - likely a socket error
                // pass the transport-level error to the caller
                err.statusCode = null;
                err.message = body;
                err.code = null;
                err.allErrors = [];
                helpers.attachBodyInfoToError(err, body);
                callback(err, body, response);
            })
        };

        return t.post("https://api.twitter.com/oauth/request_token")
            .then(r => r.data);
    };

    /**
     *
     * @param {string} requestToken
     * @param {string} requestTokenSecret
     * @param {string} oauth_verifier
     * @returns {Promise<{
     *   oauth_token: string,
     *   oauth_token_secret: string,
     *   screen_name: string,
     *   user_id: string,
     * }>}
     */
    const getAccessToken = (requestToken, requestTokenSecret, oauth_verifier) => {
        const t = new Twit({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            app_only_auth: true
        });

        t._doRestApiRequest = function (reqOpts, twitOptions, method, callback) {
            if (oauth_verifier) {
                reqOpts.form = {oauth_verifier};
            }

            const requestMethod = require('request')[method.toLowerCase()];
            const req = requestMethod(reqOpts);

            let body = '';
            let response = null;

            const onRequestEnd = function () {
                if (response && response.statusCode > 200) {
                    const err = helpers.makeTwitError('Twitter API Error');
                    err.statusCode = response ? response.statusCode : null;
                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(body);
                        helpers.attachBodyInfoToError(err, parsedBody);
                    } catch (e) {
                        // Usually the response is a simple error string
                        err.message = body;
                        err.twitterReply = body;
                        err.allErrors = err.allErrors.concat([body])
                    }
                    return callback(err, body, response);
                }

                /**
                 * @type {{
                 *   oauth_token: string,
                 *   oauth_token_secret: string,
                 *   oauth_callback_confirmed: boolean
                 * }}
                 */
                let parsedBody;
                if (body !== '') {
                    // @ts-ignore
                    parsedBody = require('querystring').decode(body);
                    // @ts-ignore
                    parsedBody.oauth_callback_confirmed = parsedBody.oauth_callback_confirmed === 'true';
                }

                // success case - no errors in HTTP response body
                callback(null, parsedBody || body, response)
            };

            req.on('response', function onRequestResponse(res) {
                response = res;
                req.on('data', function onRequestData(chunk) {
                    body += chunk.toString('utf8');
                });
                req.on('end', onRequestEnd);
            });

            req.on('error', function onRequestError(err) {
                // transport-level error occurred - likely a socket error
                // pass the transport-level error to the caller
                err.statusCode = null;
                err.message = body;
                err.code = null;
                err.allErrors = [];
                helpers.attachBodyInfoToError(err, body);
                callback(err, body, response);
            })
        };

        return t.post(`https://api.twitter.com/oauth/access_token`)
            .then(r => r.data);
    };

    /**
     *
     * @param {string} accessToken
     * @param {string} accessTokenSecret
     * @param {{include_entities?: boolean, skip_status?: boolean, include_email?: boolean}} params
     * @returns {Promise<Object<string, ?> | {
     *   id_str: string,
     *   name: string,
     *   screen_name: string,
     *   location: string,
     *   description: string,
     *   url: string,
     *   entities: {},
     *   protected: boolean,
     *   followers_count: number,
     *   friends_count: number,
     *   listed_count: number,
     *   created_at: string,
     *   favourites_count: number,
     *   time_zone: null,
     *   geo_enabled: boolean,
     *   verified: boolean,
     *   statuses_count: number,
     *   lang: string,
     *   status: {},
     *   contributors_enabled: boolean,
     *   is_translator: boolean,
     *   is_translation_enabled: null,
     *   profile_background_color: string,
     *   profile_background_image_url: string,
     *   profile_background_image_url_https: string,
     *   profile_background_tile: null,
     *   profile_image_url: string,
     *   profile_image_url_https: string,
     *   profile_banner_url: string,
     *   profile_link_color: string,
     *   profile_sidebar_border_color: string,
     *   profile_sidebar_fill_color: string,
     *   profile_text_color: string,
     *   profile_use_background_image: null,
     *   has_extended_profile: null,
     *   default_profile: boolean,
     *   default_profile_image: boolean,
     *   following: boolean,
     *   follow_request_sent: boolean,
     *   notifications: boolean,
     *   translator_type: string
     * }>}
     */
    const getUser = (accessToken, accessTokenSecret, params = {}) => {
        const t = new Twit({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            access_token: accessToken,
            access_token_secret: accessTokenSecret,
        });
        return t.get(`account/verify_credentials`, params)
            .then(r => r.data);
    };

    return {
        getRequestToken,
        getAccessToken,
        getUser,
    };
};
