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

  
/**
 * CoAP IOPA Middleware to create Default Message Properties in IOPA properties dictionary
 *
 * @class CoAPMessageCreateDefaults
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPMessageCreateDefaults(app) {
      app.properties[SERVER.Capabilities]["iopa-coap.Version"] = "1.0";
      app.properties[SERVER.Capabilities]["iopa-coap.Support"] = {
        "coap.Version": "RFC 7252"
      };
 }

CoAPMessageCreateDefaults.prototype.invoke = function CoAPMessageCreateDefaults_invoke(context, next){
     context[SERVER.Fetch] = CoAPMessageCreateDefaults_fetch.bind(this, context[IOPA.Seq], context[SERVER.Fetch]);
     return next();
};

 /**
 * CoAP IOPA Middleware for Client Message Request Defaults
 *
 * @method CoAPMessageCreateDefaults_fetch
 * @private
 */
function CoAPMessageCreateDefaults_fetch(id, nextFetch, urlStr, options, pipeline){
    return nextFetch(urlStr, options, function(context){
           CoAPFormat.defaultContext(context);
           return pipeline(context);
    });
};

module.exports = CoAPMessageCreateDefaults;