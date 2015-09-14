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
    COAP = constants.COAP;
    
/**
 *  CoAP IOPA Middleware to convert inbound UDP packets into parsed CoAP requests 
 *
 * @class CoAPServerChannelParser
 * @this app.properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function CoAPServerChannelParser(app) {
    app.properties[SERVER.Capabilities]["iopa-coap.Version"] = "1.2";
    app.properties[SERVER.Capabilities]["iopa-coap.Support"] = {
       "coap.Version": "RFC 7252"
    };
}

/**
 * @method invoke
 * @this context IOPA channelContext dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPServerChannelParser.prototype.invoke = function CoAPServerChannelParser_invoke(channelContext, next) {
    
    channelContext[IOPA.Events].on(IOPA.EVENTS.Finish, function(){
        channelContext["CoAPServerChannelParser.SessionClose"]();
    });
 
    CoAPFormat.inboundParser(channelContext, IOPA.EVENTS.Request);
    
    return next().then(function(){ return new Promise(function(resolve, reject){
           channelContext["CoAPServerChannelParser.SessionClose"] = resolve;
           channelContext["CoAPServerChannelParser.SessionError"] = reject;
        }); 
    });
};

module.exports = CoAPServerChannelParser;