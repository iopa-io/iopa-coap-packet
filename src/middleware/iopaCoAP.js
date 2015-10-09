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
   iopa = require('iopa'),
   iopaStream = require('iopa-common-stream'),
  
   constants = iopa.constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER,
    COAP = constants.COAP;

const COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap", PROTOCOLVERSION: "RFC 7252", SessionClose: "coap._SessionClose"},
      packageVersion = require('../../package.json').version
 
 const iopaClientSend = require('iopa-common-middleware').ClientSend,
  iopaMessageCache = require('iopa-common-middleware').Cache;
  
/**
 *  CoAP IOPA Middleware to convert inbound UDP packets into parsed CoAP requests 
 *
 * @class CoAPServerChannelParser
 * @this app.properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function IopaCoAP(app) {
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][IOPA.Protocol] = COAPMIDDLEWARE.PROTOCOLVERSION;
    
   this.app = app;
   this._factory = new iopa.Factory();
   
    app.use(iopaMessageCache.Match);
    app.use(iopaClientSend);
    app.use(iopaMessageCache.Cache);
 }

/**
 * CHANNEL method called for each inbound connection
 *
 * @method channel
 * @this IopaCoAP 
 * @param channelContext IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 * @returns Promise
 */
IopaCoAP.prototype.channel = function IopaCoAP_channel(channelContext, next) {
    
    channelContext[IOPA.Scheme] = IOPA.SCHEMES.COAP;

    var p = new Promise(function (resolve, reject) {
        channelContext[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][COAPMIDDLEWARE.SessionClose] = resolve;
    });
    
     channelContext[IOPA.CancelToken].onCancelled(function (reason) {
        channelContext[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][COAPMIDDLEWARE.SessionClose]();
    });

    channelContext[IOPA.Events].on(IOPA.EVENTS.Request, function (context) {
        context.using(next.invoke);
    })
    
    channelContext[IOPA.Events].on(IOPA.EVENTS.Response, function(context){
      context[IOPA.Method] = null;
    })

    return next().then(function () { 
        CoAPFormat.inboundParser(channelContext, IOPA.EVENTS.Request);  
        return p;
         });
};

/**
 * INVOKE method called for each inbound request
 *
 * @method invoke
 * @this IopaCoAP 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 * @returns Promise
 */
IopaCoAP.prototype.invoke = function IopaCoAP_invoke(context, next) {
    context[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY].observation = IopaCoAP_observation.bind(this, context);
    context.response[IOPA.Body].once("finish", context.dispatch.bind(this, context.response));  
    return next()
};

/**
 * CONNECT method called for each outbound connection
 *
 * @method connect
 * @this IopaCoAP 
 * @param channelContext IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
IopaCoAP.prototype.connect = function IopaCoAP_connect(channelContext, next){
   return next();
};

/**
 * CREATE method called to create each outbound request
 *
 * @method connect
 * @this IopaCoAP 
 * @param channelContext IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 * @returns context
 */
IopaCoAP.prototype.create = function IopaCoAP_create(context, next){
    CoAPFormat.defaultContext(context);
    return next();
};

/**
 * DISPATCH method called to translate each outbound request to transport
 *
 * @method dispatch
 * @this IopaCoAP 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 * @returns Promise
 */
IopaCoAP.prototype.dispatch = function IopaCoAP_dispatch(context, next) {    
  
    return next().then(function () {
            CoAPFormat.writeContext(context);
    
            return new Promise(function (resolve, reject) {
                context[IOPA.Events].on(IOPA.EVENTS.Response, _invokeOnResponse.bind(this, context, resolve));
            });
        });
};

function _invokeOnResponse(context, resolve, response) {
    if (!(response[COAP.Code] === "2.05" && response[IOPA.Headers]["Observe"] > '0')
        && !(response[COAP.Code] === "0.00" && response[COAP.Ack])) {
        resolve(response);
    }
}

/**
 * Private method to send observe packet
 * 
 * @method IopaCoAP_observe
 * @object ctx IOPA context dictionary
 * @private
 */
function IopaCoAP_observation(originalContext, buf) {
  var response = originalContext.create(); 
  response[SERVER.IsRequest] = false;
  response[COAP.Ack] = originalContext[COAP.Ack];
  response[COAP.Reset] = false;
  response[COAP.Confirmable] = originalContext[COAP.Confirmable];    
  response[IOPA.Token] = originalContext[IOPA.Token];
  response[COAP.Options] = null; 
  response[IOPA.Method] = null;
  response[IOPA.StatusCode] = '2.05';
  response[IOPA.ReasonPhrase] = COAP.STATUS_CODES[response[IOPA.StatusCode]];
  response[IOPA.Headers] = {};
  response[IOPA.Protocol] = originalContext[IOPA.Protocol];
  response[IOPA.MessageId] = null;
  response[IOPA.Body] = new iopaStream.OutgoingStream(buf); 
  return response.dispatch(true);
 };
 
module.exports = IopaCoAP;
