/* global [ */
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

 const Promise = require('bluebird')
    , CoapPacket = require('coap-packet')
    , util = require('util')
    , iopaStream = require('iopa-common-stream')
    , iopaContextFactory = require('iopa').context.factory
    , helpers = require('./helpers.js')
    , URL = require('url')
    , constants = require('./constants.js');
    
/**
 * Default IOPA Request for CoAP fields
 *
 * @method defaultContext

 * @object context IOPA context dictionary
 * @returns void
 * @public
 */
module.exports.defaultContext = function CoAPFormat_defaultContext(context) {  
 
  context["coap.Ack"] = false;
  context["coap.Reset"] = false;
  context["coap.Confirmable"] = true;
  context["iopa.MessageId"] = _nextMessageId();
  context["coap.Token"] = _nextToken();
  return context;
};

/**
 * @method inboundParseMonitor
 * @object context IOPA context dictionary
  */
module.exports.inboundParser = function CoAPFormat_inboundParseMonitor(channelContext, eventType) {
     var rawStream, context;
        
     if (eventType == "response")
       rawStream = channelContext.response["server.RawStream"]
     else
       rawStream = channelContext["server.RawStream"];
    
      rawStream.on("data", function(chunk){
        
        if (eventType == "response")
           context = _createResponseContext(channelContext);
        else
            context = channelContext;
           
        var packet = CoapPacket.parse(chunk);
             /*
             *   packet contains:
             *       code   string
             *       confirmable   boolean
             *       reset   boolean    
             *       ack    boolean
             *       messageId  UInt16
             *       token: buffer hex
             *       options    array   {name: string, value: buffer}
             *       payload   buffer
             */
         
        _parsePacket.call(this, packet, context);
       
        if (packet.code > '0.00' && packet.code<'1.00')
           channelContext["iopa.Events"].emit(eventType, context);  //REQUEST
        else
           channelContext["iopa.Events"].emit(eventType, context);   //RESPONSE
          
        context["server.InProcess"] = false;
        
        if (eventType == "response")
          _onClose(context);
        else
          context["iopa.Events"].emit("iopa.Complete");
      });
};

/**
 * Helper to Close Incoming MQTT Packet
 * 
 * @method _onClose
 * @object packet MQTT Raw Packet
 * @object ctx IOPA context dictionary
 * @private
 */
function _onClose(ctx) {
    setTimeout(function() {
        iopaContextFactory.dispose(ctx);
    }, 1000);
    
   if (ctx["server.InProcess"])
     ctx["iopa.CallCancelledSource"].cancel('Client Socket Disconnected');
   
 // ctx["server.ChannelContext"]["server.RawComplete"]();
};


function _createResponseContext(parentContext)
{
        var context = iopaContextFactory.create();
        context["server.TLS"] = parentContext.response["server.TLS"];
        context["server.RemoteAddress"] = parentContext.response["server.RemoteAddress"];
        context["server.RemotePort"] = parentContext.response["server.RemotePort"] ;
        context["server.LocalAddress"] = parentContext.response["server.LocalAddress"];
        context["server.LocalPort"] = parentContext.response["server.LocalPort"]; 
        context["server.RawStream"] = parentContext.response["server.RawStream"];    
        context.response["server.TLS"] = parentContext["server.TLS"];    
        context.response["server.RemoteAddress"] = parentContext["server.RemoteAddress"];    
        context.response["server.RemotePort"] = parentContext["server.RemotePort"];    
        context.response["server.LocalAddress"] = parentContext["server.LocalAddress"];    
        context.response["server.LocalPort"] = parentContext["server.LocalPort"];    
        context.response["server.RawStream"] = parentContext["server.RawStream"];    
        context["server.Logger"] = parentContext["server.Logger"];
        context.log = context["server.Logger"];
        
        context["server.ChannelContext"] = parentContext;
        context["server.CreateRequest"] = parentContext["server.CreateRequest"];
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
  
   
 if (context["iopa.MessageId"] === undefined)
     context["iopa.MessageId"] = _nextMessageId();
  
   var packet = {
     code: helpers.METHOD_CODES[context["iopa.Method"]] ,
     confirmable: context["coap.Confirmable"],
     reset: context["coap.Reset"],
     ack: context["coap.Ack"],
     messageId: context["iopa.MessageId"],
     token: context["coap.Token"],
     payload: context["iopa.Body"].toBuffer()
   };
 
   var headers = context["iopa.Headers"];
   var options = [];
   
   options.push({name: 'Uri-Path', 'value': new Buffer(context["iopa.PathBase"] + context["iopa.Path"])});
   if (context["iopa.QueryString"])
        packet.options.push({name: 'Uri-Query', 'value': new Buffer(context["iopa.QueryString"])});

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
  
    /*
     *   packet contains:
     *       code   string
     *       confirmable   boolean
     *       reset   boolean    
     *       ack    boolean
     *       messageId  UInt16
     *       token: buffer hex
     *       options    array   {name: string, value: buffer}
     *       payload   buffer
     */
     
 context["server.ResendOnTimeout"] =  !(context["coap.Ack"] || context["coap.Reset"] || context["coap.Confirmable"] === false);
 
  var buf = CoapPacket.generate(packet);
  context["server.RawStream"].write(buf);
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
    var headers= {};
    var options = packet.options;
    var paths   = [];
    var queries = [];

    for (var i=0; i < options.length; i++) {
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
    
    context["iopa.Headers"] = headers;
    context["iopa.Path"] =paths.join('/') || "";
    context["iopa.PathBase"] = "";
    context["iopa.QueryString"] = queries.join('&');
       if (packet.code > '0.00' && packet.code<'1.00')
       {
            context["iopa.Method"] = helpers.COAP_CODES[packet.code].toUpperCase(); //REQUEST
            context["iopa.StatusCode"] = 0;
            context["server.IsRequest"] = true;   
       }
        else
        {
          context["iopa.StatusCode"] =packet.code;  //RESPONSE
          context["iopa.Method"] = packet.code;
          context["server.IsRequest"] = false; 
        }
  
    context["iopa.Protocol"] = "COAP/1.0";
    context["iopa.Body"] = iopaStream.EmptyStream;

         
    if (context["server.TLS"])
        context["iopa.Scheme"] = "coaps";
    else
        context["iopa.Scheme"] = "coap";

    context["coap.Ack"] = packet.ack;
    context["coap.Reset"] = packet.reset;
    context["coap.Confirmable"] = packet.confirmable;
    context["coap.Token"] = packet.token;
    context["coap.Options"] = packet.options;
    context["coap.Code"] = packet.code;
    context["coap.WriteAck"] = _writeAck.bind(this, context.response);
    context["coap.WriteError"] = _writeError.bind(this, context.response);
  
    context["iopa.MessageId"] = packet.messageId;
    context["iopa.Body"] =  new iopaStream.BufferStream(packet.payload);
 
    context["server.IsRequest"] = true;
    context["server.IsLocalOrigin"] = false;
       
    context['iopa.ReasonPhrase'] = helpers.STATUS_CODES[context["iopa.StatusCode"]];
     
    // SETUP RESPONSE DEFAULTS
    var response = context.response;
    
    response["iopa.StatusCode"] = '2.05';
   
    response["iopa.Headers"] = {};
    response["iopa.Protocol"] = context["iopa.Protocol"];
    response["iopa.MessageId"] = context["iopa.MessageId"];
    
    // SETUP RESPONSE DEFAULTS

    response["coap.Ack"] = context["coap.Ack"];
    response["coap.Reset"] = false;
    response["coap.Confirmable"] = context["coap.Confirmable"];
    response["iopa.MessageId"] = context["iopa.MessageId"];
    response["coap.Token"] = context["coap.Token"];
    response["coap.Options"] = undefined; // USE iopa.Headers instead
    Object.defineProperty(response, 'iopa.Method', {
       get: function() { return response["iopa.StatusCode"]; },
       enumerable: true,
       configurable: true
      });
    
     if ('Observe' in context["iopa.Headers"] ) 
        response["iopa.Body"]  =  new iopaStream.OutgoingMultiSendStream();
     else
        response["iopa.Body"]  =  new iopaStream.OutgoingStream();
         
    response['iopa.ReasonPhrase'] = helpers.STATUS_CODES[response["iopa.StatusCode"]];
           
    if (response["iopa.Body"])
    {
      response["iopa.Body"].on("finish", _coapSendResponse.bind(this, context));
      response["iopa.Body"].on("data", _coapSendResponse.bind(this, context));
    }
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
    
    if (response["iopa.MessageId"] === undefined)
     response["iopa.MessageId"] = _nextMessageId();

   var packet = {
     code: response["iopa.StatusCode"] ,
     confirmable: response["coap.Confirmable"],
     reset: response["coap.Reset"],
     ack: response["coap.Ack"],
     messageId: response["iopa.MessageId"],
     token: response["coap.Token"],
     payload: payload
   };
   
   delete response["iopa.MessageId"];
 
   var headers = response["iopa.Headers"];
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
   
  response["server.ResendOnTimeout"] =  !(response["coap.Ack"] || response["coap.Reset"] || response["coap.Confirmable"] === false);
    
  var buf = CoapPacket.generate(packet);
  response["server.RawStream"].write(buf);
}

/**
 * Coap IOPA Utility to write Raw CoAP containing 5.00 Error Message
 * 
 * @function Write500Error
 * @public
 */
function _writeError(context, errorPayload) {
  
  var buf = CoapPacket.generate({ code: '5.00', payload: errorPayload });
  
  context["server.RawStream"].write(buf);
}

/**
 * Coap IOPA Utility to Write Raw CoAP Message containing 0.00 Ack Message for given Message Id
 * 
 * @function GenerateAckToBuffer
 * @public
 */
function _writeAck(context) {
  if (context["iopa.MessageId"] === undefined)
     context["iopa.MessageId"] = _nextMessageId();
 
    var buf = CoapPacket.generate( {
              messageId: context["iopa.MessageId"]
            , code: '0.00'
            , options: []
            , confirmable: false
            , ack: true
            , reset: false
          });
          
  delete  context["iopa.MessageId"];
          
  context["server.RawStream"].write(buf);
}

// SETUP REQUEST DEFAULTS 
const maxMessageId   = Math.pow(2, 16);
const  maxToken        = Math.pow(2, 32)
var _lastMessageId = Math.floor(Math.random() * (maxMessageId - 1));
var _lastToken = Math.floor(Math.random() * (maxToken - 1));

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
