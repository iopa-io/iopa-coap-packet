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

const COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap", PROTOCOLVERSION: "RFC 7252"},
      packageVersion = require('../../package.json').version,
      THISMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap:serverchannel", SESSIONCLOSE: "serverchannel.SessionClose"}

/**
 *  CoAP IOPA Middleware to convert inbound UDP packets into parsed CoAP requests 
 *
 * @class CoAPServerChannelParser
 * @this app.properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function CoAPServerChannelParser(app) {
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][IOPA.Protocol] = COAPMIDDLEWARE.PROTOCOLVERSION;
    
    app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
}

/**
 * @method invoke
 * @this context IOPA channelContext dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoAPServerChannelParser.prototype.channel = function CoAPServerChannelParser_invoke(channelContext, next) {
    
    channelContext[IOPA.Scheme] = IOPA.SCHEMES.COAP;
    
    var p = new Promise(function(resolve, reject){
           channelContext[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.SESSIONCLOSE] = resolve;
        }); 
    
    channelContext[IOPA.Events].on(IOPA.EVENTS.Finish, function(){
        channelContext[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][THISMIDDLEWARE.SESSIONCLOSE]();
    });
 
 
     channelContext[IOPA.Events].on(IOPA.EVENTS.Request, function(context){
         context.using(next.invoke);
     })
  
    CoAPFormat.inboundParser(channelContext, IOPA.EVENTS.Request);
    
   return next().then(function () { return p });
};

module.exports = CoAPServerChannelParser;