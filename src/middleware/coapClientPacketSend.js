/*
 * Copyright (c) 2015 Limerun Project Contributors
 * Portions Copyright (c) 2015 Internet of Protocols Assocation (IOPA)
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

var Promise = require('bluebird')
    , util = require('util')
    , CoAPFormat = require('../common/coapFormat.js')
  
/**
 * Parses IOPA request into CoAP packet
 * IOPA Default App in Client Pipeline
 *
 * @method invoke
 * @param context IOPA context dictionary
 */
module.exports = function CoAPClientPacketSend(context) {      
    try {
        CoAPFormat.sendRequest(context);
    }
    catch (err) {
        context["server.Logger"].error("[COAPCLIENTPACKETSEND] Unable to send CoAP packet " 
            + context["iopa.Method"] + ": " + err);
        context =null;
        return Promise.reject('Unable to parse IOPA Message into CoAP packet');
    }
 
     return new Promise(function(resolve, reject){
         context["iopa.Events"].on("response", CoAPClientPacketSend_Response.bind(this, context, resolve));
     });
};

function CoAPClientPacketSend_Response(context, resolve, response) {
    if (!(response["coap.Code"] === "2.05" && response["iopa.Headers"]["Observe"]>'0')
      && !(response["coap.Code"] === "0.00" && response["coap.Ack"]))
     {
        context.log.info("[COAP-CLIENT] RESOLVING " + context["iopa.Seq"] + " with " + response["iopa.Seq"]);
        resolve(response);
     } else
        context.log.info("[COAP-CLIENT] NOT RESOLVING " + context["iopa.Seq"] + " with " + response["iopa.Seq"]);
 }