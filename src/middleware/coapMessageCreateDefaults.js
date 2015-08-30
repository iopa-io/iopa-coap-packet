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
 * CoAP IOPA Middleware to create Default Message Properties in IOPA properties dictionary
 *
 * @class CoAPMessageCreateDefaults
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPMessageCreateDefaults(app) {
      app.properties["server.Capabilities"]["iopa-coap.Version"] = "1.0";
      app.properties["server.Capabilities"]["iopa-coap.Support"] = {
        "coap.Version": "RFC 7252"
      };
 }

CoAPMessageCreateDefaults.prototype.invoke = function CoAPMessageCreateDefaults_invoke(context, next){
     context["server.CreateRequest"] = CoAPMessageCreateDefaults_createRequest.bind(this, context["server.CreateRequest"]);
     context["coap.WriteAck"] = CoAPFormat.WriteAck.bind(this, context.response);
     return next();
};

 /**
 * CoAP IOPA Middleware for Client Message Request Defaults
 *
 * @method CoAPMessageCreateDefaults_createRequest
 * @parm {string} path url representation of ://127.0.0.1/hello
 * @parm {string} [method]  request method (e.g. 'GET')
 * @returns context
 * @public
 */
function CoAPMessageCreateDefaults_createRequest(nextFactory, urlStr, method){
    var context = nextFactory(urlStr, method);
    CoAPFormat.defaultContext(context);
    return context;
};

module.exports = CoAPMessageCreateDefaults;