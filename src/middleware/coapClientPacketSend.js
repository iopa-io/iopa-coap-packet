/*
 * Copyright (c) 2015 Internet of Protocols Alliance (IOPA)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// DEPENDENCIES

const util = require('util'),
    CoAPFormat = require('../common/coapFormat.js'),
    
   constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER,
    COAP = constants.COAP

const COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap", PROTOCOLVERSION: "RFC 7252"},
       packageVersion = require('../../package.json').version;

/**
 * CoAP IOPA Middleware to to dispatch record
 *
 * @class CoAPClientPacketSend
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPClientPacketSend(app) { 
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][IOPA.Protocol] = COAPMIDDLEWARE.PROTOCOLVERSION;
}

CoAPClientPacketSend.prototype.dispatch = function CoAPClientPacketSend_dispatch(context, next) {
    if (!context[SERVER.IsRequest])
        return next();

    return next().then(function () {
        try {
            CoAPFormat.sendRequest(context);
        }
        catch (err) {
            context[SERVER.Logger].error("[COAP-CLIENTPACKETSEND] Unable to send CoAP packet "
                + context[IOPA.Method] + ": " + err);
            context = null;
            return new Promise(function (resolve, reject) { reject('Unable to parse IOPA Message into CoAP packet'); });
        }

        return new Promise(function (resolve, reject) {
            context[IOPA.Events].on(IOPA.EVENTS.Response, CoAPClientPacketSend_Response.bind(this, context, resolve));
        });

    });
};

function CoAPClientPacketSend_Response(context, done, response) {
    if (!(response[COAP.Code] === "2.05" && response[IOPA.Headers]["Observe"] > '0')
        && !(response[COAP.Code] === "0.00" && response[COAP.Ack])) {
        done(response);
    }
}
 
 module.exports = CoAPClientPacketSend;