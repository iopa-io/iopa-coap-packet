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
 
const util = require('util')
  , Promise = require('bluebird');

const iopa = require('iopa')
  , UdpServer = require('iopa-udp')
  , IopaServer = require('iopa-server');

const CoAPClientChannelParser = require('../middleware/coapClientChannelParser.js')
   , CoAPClientPacketSend  = require('../middleware/coapClientPacketSend.js')
   , CoAPMessageCreateDefaults = require('../middleware/coapMessageCreateDefaults.js')
   , CoAPServerChannelParser = require('../middleware/coapServerChannelParser.js')
  
const iopaClientSend = require('iopa-common-middleware').ClientSend
    , iopaMessageCache = require('iopa-common-middleware').Cache;

var globalClient = null;

/* *********************************************************
 * IOPA CoAP SERVER / CLIENT WITH MIDDLEWARE CONSTRUCTED
 * ********************************************************* */

/**
 * CoAP IOPA Server includes CoAP Client
 * 
 * @class CoAPServer
 * @param {object} options  
 * @param {appFunc} appFunc  Server callback in IOPA AppFunc format
 * @constructor
 */
function CoAPPacketServer(options, appFuncServer, appFuncClient) {
  if (!(this instanceof CoAPPacketServer))
    return new CoAPPacketServer(options, appFuncServer, appFuncClient);
    
  if (typeof options === 'function') {
     appFuncClient = appFuncServer;
    appFuncServer = options;
    options = {};
  }
  
  /**
    * Call Parent Constructor to ensure the following are created
    *   this.serverPipeline
    *   this.clientPipeline
    */
  IopaServer.call(this, options, appFuncServer, appFuncClient);
  
   // INIT UDP SERVER
  this._udp = new UdpServer(options, this.serverPipeline, this.clientPipeline);
}

util.inherits(CoAPPacketServer, IopaServer);

/* ****************************************************** */
// PIPELINE SETUP METHODS OVERRIDES
/**
 * SERVER CHANNEL PIPELINE SETUP
 * @InheritDoc
 */
CoAPPacketServer.prototype._serverChannelPipelineSetup = function (serverApp) {
  serverApp.use(CoAPServerChannelParser);
  serverApp.use(iopaMessageCache.Match);

};

/**
 * SERVER MESSAGE PIPELINE SETUP
 * Create Middleware Pipeline for Each Server Request Message
 *
 * @method _serverMessagePipelineSetup
 * @app IOPA Application Instance
 * @returns void
 * @public MUSTINHERIT
 */
CoAPPacketServer.prototype._serverMessagePipelineSetup = function (app) {
    app.use(iopaMessageCache.Cache);
};

/**
 * CLIENT CONNECT PIPELINE
 * @InheritDoc
 */
CoAPPacketServer.prototype._clientConnectPipelineSetup = function (clientConnectApp) {
  clientConnectApp.use(CoAPMessageCreateDefaults);
  clientConnectApp.use(CoAPClientChannelParser);
  clientConnectApp.use(iopaClientSend);
  clientConnectApp.use(iopaMessageCache.Match);
};

/**
 * CLIENT MESSAGE SEND PIPELINE
 * @InheritDoc
 */
CoAPPacketServer.prototype._clientMessageSendPipelineSetup = function (clientSendApp) {
  clientSendApp.use(iopaMessageCache.Cache);
  clientSendApp.properties["app.DefaultApp"] = CoAPClientPacketSend;
};


/* ****************************************************** */
// OVERRIDE METHODS

/**
 * CoAPServer.listen()  Begin accepting connections on the specified port and hostname. 
 * If the hostname is omitted, the server will accept connections directed to any IPv4 address (INADDR_ANY).
 * 
 * @method listen
 * @param {integer} port  
 * @param {string} address (IPV4 or IPV6)
 * @returns promise completes when listening
 * @public
 */
CoAPPacketServer.prototype._listen = function CoAPServer_listen(port, address) {
   return this._udp.listen(port, address);
};

Object.defineProperty(CoAPPacketServer.prototype, "port", { get: function () { return this._udp.port; } });
Object.defineProperty(CoAPPacketServer.prototype, "address", { get: function () { return this._udp.address; } });

/**
 * CoAPServer.connect() Create CoAP Session over UDP Channel to given Host and Port
 *
 * @method connect
 * @this CoAPServer instance
 * @parm {string} urlStr url representation of Request coap://127.0.0.1/hello
 * @returns {Promise(context)}
 * @public
 */
CoAPPacketServer.prototype._connect = function CoAPServer_connect(urlStr) {
  return this._udp.connect(urlStr);
};

/**
 * CoAPServer.close() Close UDP Socket 
 *
 * @method connect
 * @this CoAPServer instance
 * @returns {Promise()}
 * @public
 */
CoAPPacketServer.prototype._close = function CoAPServer_close() {
  return this._udp.close();
};

module.exports = CoAPPacketServer;