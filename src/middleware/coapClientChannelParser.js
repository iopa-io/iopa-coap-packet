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
   
const util = require('util')
    , CoAPFormat = require('../common/coapFormat.js'),
  
  constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER,
    COAP = constants.COAP
        
const THISMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap:clientchannel"},
      COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap"},
       packageVersion = require('../../package.json').version;

 /**
 * CoAP IOPA Middleware to convert inbound UDP packets into parsed CoAP responses
 *
 * @class CoAPClientChannelParser
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPClientChannelParser(app) {
    if (!app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");
     
    app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
}

CoAPClientChannelParser.prototype.invoke = function CoAPClientChannelParser_invoke(context, next){
      return next(); 
}

CoAPClientChannelParser.prototype.connect = function CoAPClientChannelParser_connect(channelContext, next){
     CoAPFormat.inboundParser(channelContext, IOPA.EVENTS.Response);
     return next();
};

module.exports = CoAPClientChannelParser;
