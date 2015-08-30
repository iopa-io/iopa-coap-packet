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
 * CoAP IOPA Middleware to convert inbound UDP packets into parsed CoAP responses
 *
 * @class CoAPClientChannelParser
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPClientChannelParser(app) {
    if (!app.properties["server.Capabilities"]["iopa-coap.Version"])
        throw ("Missing Dependency: CoAP Server/Middleware in Pipeline");

   app.properties["server.Capabilities"]["CoAPClientChannelParser.Version"] = "1.0";
}

CoAPClientChannelParser.prototype.invoke = function CoAPClientChannelParser_invoke(channelContext, next){
     CoAPFormat.inboundParser(channelContext, "response");
     return next();
};

module.exports = CoAPClientChannelParser;
