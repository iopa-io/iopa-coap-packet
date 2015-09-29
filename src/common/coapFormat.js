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

const coapPacket = require('coap-packet')
  , util = require('util')
  , iopaStream = require('iopa-common-stream')
  , iopa = require('iopa')
  , helpers = require('./helpers.js')
  , URL = require('url')

const constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  COAP = constants.COAP
   
// SETUP REQUEST DEFAULTS 
const maxMessageId = Math.pow(2, 16);
const maxToken = Math.pow(2, 32)
var _lastMessageId = Math.floor(Math.random() * (maxMessageId - 1));
var _lastToken = Math.floor(Math.random() * (maxToken - 1));
   
/**
 * Default IOPA Request for CoAP fields
 *
 * @method defaultContext

 * @object context IOPA context dictionary
 * @returns void
 * @public
 */
module.exports.defaultContext = function CoAPFormat_defaultContext(context) {
  context[COAP.Ack] = false;
  context[COAP.Reset] = false;
  context[COAP.Confirmable] = true;
  context[IOPA.MessageId] = _nextMessageId();
  context[IOPA.Token] = _nextToken();
  return context;
};

/**
 * @method inboundParseMonitor
 * @object context IOPA context dictionary
  */
module.exports.inboundParser = function CoAPFormat_inboundParseMonitor(channelContext, eventType) {
  var rawStream, context;

  if (eventType == IOPA.EVENTS.Response)
    rawStream = channelContext.response[SERVER.RawStream]
  else
    rawStream = channelContext[SERVER.RawStream];

  rawStream.on("data", function (chunk) {
    var packet = coapPacket.parse(chunk);
     /*
    *   packet contains:
    *       code   string
    *       confirmable   boolean
    *       reset   boolean    
    *       ack    boolean
    *       messageId  UInt16
    *       token  buffer hex
    *       options    array   {name: string, value: buffer}
    *       payload   buffer
    */
    if (packet.code > '0.00' && packet.code < '1.00')
      context = channelContext;
    else
      context = _createResponseContext(channelContext);

    _parsePacket.call(this, packet, context);

    if (packet.code > '0.00' && packet.code < '1.00') {
          // assume request listener is hooked to an AppBuilder that self-disposes context when done;        
          channelContext[IOPA.Events].emit(IOPA.EVENTS.Request, context);  //REQUEST
     }
    else {
      channelContext[IOPA.Events].emit(IOPA.EVENTS.Response, context);   //RESPONSE 
      setTimeout(context.dispose, 50);
    }
  });
};

function _createResponseContext(parentContext) {
  var parentResponse = parentContext.response;

  var context = parentContext[SERVER.Factory].createContext();
  parentContext[SERVER.Factory].mergeCapabilities(context, parentContext);
  var response = context.response;

  context[SERVER.TLS] = parentResponse[SERVER.TLS];
  context[SERVER.RemoteAddress] = parentResponse[SERVER.RemoteAddress];
  context[SERVER.RemotePort] = parentResponse[SERVER.RemotePort]
  context[SERVER.LocalAddress] = parentResponse[SERVER.LocalAddress]
  context[SERVER.LocalPort] = parentResponse[SERVER.LocalPort]
  context[SERVER.RawStream] = parentResponse[SERVER.RawStream]
  context[SERVER.IsLocalOrigin] = parentResponse[SERVER.IsLocalOrigin]
  context[SERVER.IsRequest] = parentResponse[SERVER.IsRequest];
  context[SERVER.SessionId] = parentResponse[SERVER.SessionId];

  response[SERVER.TLS] = parentContext[SERVER.TLS];
  response[SERVER.RemoteAddress] = parentContext[SERVER.RemoteAddress];
  response[SERVER.RemotePort] = parentContext[SERVER.RemotePort];
  response[SERVER.LocalAddress] = parentContext[SERVER.LocalAddress];
  response[SERVER.LocalPort] = parentContext[SERVER.LocalPort];
  response[SERVER.RawStream] = parentContext[SERVER.RawStream];
  response[SERVER.RawTransport] = parentContext[SERVER.RawTransport];
  response[SERVER.IsLocalOrigin] = parentContext[SERVER.IsLocalOrigin]
  response[SERVER.IsRequest] = parentContext[SERVER.IsRequest]

  context[SERVER.Fetch] = parentContext[SERVER.Fetch];
  context[SERVER.Dispatch] = parentContext[SERVER.Dispatch];

  return context;
}

/**
 * CoAP IOPA Utility to Convert and Send Outgoing Client IOPA Request in Raw CoAP Packet (buffer)
 * 
 * @method SendRequest
 * @object context IOPA context dictionary
 * @returns void
 * @private
 */
module.exports.sendRequest = function coapFormat_SendRequest(context) {

  if (!context[IOPA.MessageId])
    context[IOPA.MessageId] = _nextMessageId();

  var packet = {
    code: COAP.CODES[context[IOPA.Method]],
    confirmable: context[COAP.Confirmable],
    reset: context[COAP.Reset],
    ack: context[COAP.Ack],
    messageId: context[IOPA.MessageId],
    token: context[IOPA.Token],
    payload: context[IOPA.Body].toBuffer()
  };

  var headers = context[IOPA.Headers];
  var options = [];

  options.push({ name: 'Uri-Path', 'value': new Buffer((context[IOPA.PathBase] + context[IOPA.Path]).replace(/^\/|\/$/g, '')) });
  if (context[IOPA.QueryString])
    options.push({ name: 'Uri-Query', 'value': new Buffer(context[IOPA.QueryString]) });

  for (var key in headers) {
    if (headers.hasOwnProperty(key)) {
      if (key == 'Content-Type')
        key = 'Content-Format';

      options.push({
        name: key,
        value: headers[key]
      });
    }
  };

  packet.options = options;

  context[SERVER.Retry] = !(context[COAP.Ack] || context[COAP.Reset] || context[COAP.Confirmable] === false);

  var buf = coapPacket.generate(packet);
  context[SERVER.RawStream].write(buf);
};


// PRIVATE HELPER FUNCTIONS 

/**
 * Helper to Convert Incoming CoAP Packet to IOPA Format
 * 
 * @method _requestFromPacket
 * @object packet CoAP Raw Packet
 * @object ctx IOPA context dictionary
 * @private
 */
function _parsePacket(packet, context) { 
  
  // PARSE PACKET
  var headers = {};
  var options = packet.options;
  var paths = [];
  var queries = [];

  for (var i = 0; i < options.length; i++) {
    var option = options[i]

    if (option.name === 'Uri-Path') {
      paths.push(option.value)
    }

    if (option.name === 'Uri-Query') {
      queries.push(option.value)
    }

    option.value = helpers.fromBinary(option.name, option.value);

    headers[option.name] = option.value;
  };

  if (headers['Content-Format'])
    headers['Content-Type'] = headers['Content-Format'];

  headers["Content-Length"] = packet.length;

  context[IOPA.Headers] = headers;
  context[IOPA.Path] = '/' + (paths.join('/') || "");
  context[IOPA.PathBase] = "";
  context[IOPA.QueryString] = queries.join('&');
  if (packet.code > '0.00' && packet.code < '1.00') {
    context[IOPA.Method] = COAP.CODES[packet.code];  //REQUEST
   
    context[IOPA.StatusCode] = 0;
    context[SERVER.IsRequest] = true;
  }
  else {
    context[IOPA.StatusCode] = packet.code;  //RESPONSE
    context[IOPA.Method] = packet.code;
    context[SERVER.IsRequest] = false;
  }

  context[IOPA.Protocol] = IOPA.PROTOCOLS.COAP;
  context[IOPA.Body] = iopaStream.EmptyStream;

  if (context[SERVER.TLS])
    context[IOPA.Scheme] = IOPA.SCHEMES.COAPS;
  else
    context[IOPA.Scheme] = IOPA.SCHEMES.COAP;

  context[COAP.Ack] = packet.ack;
  context[COAP.Reset] = packet.reset;
  context[COAP.Confirmable] = packet.confirmable;
  context[IOPA.Token] = packet.token;
  context[COAP.Options] = packet.options;
  context[COAP.Code] = packet.code;
  context[SERVER.WriteAck] = _writeAck.bind(this, context.response);
  context[SERVER.WriteErr] = _writeError.bind(this, context.response);

  context[IOPA.MessageId] = packet.messageId;
  context[IOPA.Body] = new iopaStream.BufferStream(packet.payload);

  context[SERVER.IsLocalOrigin] = false;

  context[IOPA.ReasonPhrase] = COAP.STATUS_CODES[context[IOPA.StatusCode]];
     
  // SETUP RESPONSE DEFAULTS
  var response = context.response;

  response[IOPA.StatusCode] = '2.05';

  response[IOPA.Headers] = {};
  response[IOPA.Protocol] = context[IOPA.Protocol];
  response[IOPA.MessageId] = context[IOPA.MessageId];
    
  // SETUP RESPONSE DEFAULTS

  response[COAP.Ack] = context[COAP.Ack];
  response[COAP.Reset] = false;
  response[COAP.Confirmable] = false;    // default for piggy-backed responses
  response[IOPA.Token] = context[IOPA.Token];
  response[COAP.Options] = undefined; // USE iopa.Headers instead
  response[IOPA.Method] = response[IOPA.StatusCode];
  /*  Object.defineProperty(response, IOPA.Method, {
       get: function() { return this[IOPA.StatusCode]; },
       enumerable: true,
       configurable: true
      }); */

  if ('Observe' in context[IOPA.Headers])
  {
    response[IOPA.Body] = new iopaStream.OutgoingMultiSendStream();
    response[IOPA.Body].on("data", _coapSendResponse.bind(this, context));

  }
  else
  {
    response[IOPA.Body] = new iopaStream.OutgoingStream();
    response[IOPA.Body].on("finish", _coapSendResponse.bind(this, context, context.response[IOPA.Body].toBuffer.bind(context.response[IOPA.Body])));
  }
  
  response[IOPA.ReasonPhrase] = COAP.STATUS_CODES[response[IOPA.StatusCode]];

}

/**
 * Private method to send response packet
 * Triggered on data or finish events
 * 
 * @method _requestFromPacket
 * @object packet CoAP Raw Packet
 * @object ctx IOPA context dictionary
 * @private
 */
function _coapSendResponse(context, payload) {
   var response = context.response;
   if (typeof payload == 'function')
     payload = payload();
  
  if (!response[IOPA.MessageId])
    response[IOPA.MessageId] = _nextMessageId();

  var packet = {
    code: response[IOPA.StatusCode],
    confirmable: response[COAP.Confirmable],
    reset: response[COAP.Reset],
    ack: response[COAP.Ack],
    messageId: response[IOPA.MessageId],
    token: response[IOPA.Token],
    payload: payload
  };

  var headers = response[IOPA.Headers];
  var options = [];

  for (var key in headers) {
    if (key !== 'Content-Length' && headers.hasOwnProperty(key)) {
      if (key == 'Content-Type')
        key = 'Content-Format';

      options.push({
        name: key,
        value: headers[key]
      });


    }
  };

  packet.options = options;

  response[SERVER.Retry] = !(response[COAP.Ack] || response[COAP.Reset] || response[COAP.Confirmable] === false);
  var buf = coapPacket.generate(packet);
  response[SERVER.RawStream].write(buf);

  // response[IOPA.MessageId] = null;
}

/**
 * Coap IOPA Utility to write Raw CoAP containing 5.00 Error Message
 * 
 * @function Write500Error
 * @public
 */
function _writeError(context, errorPayload) {

  var buf = coapPacket.generate({ code: '5.00', payload: errorPayload });

  context[SERVER.RawStream].write(buf);
}

const CACHE = {CAPABILITY: "urn:io.iopa:cache",
     DB: "cache.Db",
     DONOTCACHE: "cache.DoNotCache"
      }
/**
 * Coap IOPA Utility to Write Raw CoAP Message containing 0.00 Ack Message for given Message Id
 * 
 * @function GenerateAckToBuffer
 * @public
 */
function _writeAck(context) {
  if (!context[IOPA.MessageId])
    context[IOPA.MessageId] = _nextMessageId();

  var buf = coapPacket.generate({
    messageId: context[IOPA.MessageId]
    , code: '0.00'
    , options: []
    , confirmable: false
    , ack: true
    , reset: false
  });

  var code = context[IOPA.StatusCode];
  var reason = context[IOPA.ReasonPhrase];
  var donotcache = context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DONOTCACHE];
  context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DONOTCACHE] = true;
  
  context[IOPA.StatusCode] = "0.00";
  context[IOPA.Method] = "0.00";
 
  context[IOPA.ReasonPhrase] = COAP.STATUS_CODES[context[IOPA.StatusCode]];
  context[SERVER.RawStream].write(buf);
   context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DONOTCACHE] = donotcache;
 
  context[IOPA.StatusCode] = code;
  context[IOPA.Method] = code;
 
  context[IOPA.ReasonPhrase] = reason;
  context[IOPA.MessageId] = null;
}

/**
 * CoAP  Utility for sequential message id
 * 
 * @function _nextMessageId
 * @returns number
 * @private
 */
function _nextMessageId() {
  if (++_lastMessageId === maxMessageId)
    _lastMessageId = 1;

  return _lastMessageId;
};

/**
 * CoAP  Utility for sequential Token id
 * 
 * @function _nextToken
 * @returns buffer
 * @private
 */
function _nextToken() {
  var buf = new Buffer(4);

  if (++_lastToken === maxToken)
    this._lastToken = 0;

  buf.writeUInt32BE(_lastToken, 0);

  return buf;
}
