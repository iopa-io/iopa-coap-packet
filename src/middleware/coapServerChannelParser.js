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

// DEPENDENCIES

var util = require('util')
  , Promise = require('bluebird')
  , CoAPFormat = require('../common/coapFormat.js');
  
/**
 *  CoAP IOPA Middleware to convert inbound UDP packets into parsed CoAP requests 
 *
 * @class CoAPServerChannelParser
 * @this app.properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function CoAPServerChannelParser(app) {
    app.properties["server.Capabilities"]["iopa-coap.Version"] = "1.2";
    app.properties["server.Capabilities"]["iopa-coap.Support"] = {
       "coap.Version": "RFC 7252"
    };
}

/**
 * @method invoke
 * @this context IOPA channelContext dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPServerChannelParser.prototype.invoke = function CoAPServerChannelParser_invoke(context, next) {
    
    var futureClose = new Promise(function(resolve, reject){
           context["CoAPServerChannelParser.SessionClose"] = resolve;
           context["CoAPServerChannelParser.SessionError"] = reject;
        }); 
 
    context["iopa.Events"].on("iopa.Complete", function(){
        context["CoAPServerChannelParser.SessionClose"]();
    });
 
    CoAPFormat.inboundParser(context, "request");
    
    return next().then(function(){ return futureClose; });



    if (!(response["coap.Code"] === "2.05" && response["iopa.Headers"]["Observe"]>'0')
      && !(response["coap.Code"] === "0.00" && response["coap.Ack"]))
    {
        context.log.info("[COAP-CLIENT] RESOLVING " + context["iopa.Seq"] + " with " + response["iopa.Seq"]);
        resolve(response);
    } else
        context.log.info("[COAP-CLIENT] NOT RESOLVING " + context["iopa.Seq"] + " with " + response["iopa.Seq"]);


};

module.exports = CoAPServerChannelParser;