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
 
const util = require('util');

const iopa = require('iopa'),
  udp = require('iopa-udp'),
  IopaServer = require('iopa-server');

const constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  APPBUILDER = constants.APPBUILDER,
  COAP = constants.COAP;

const CoAPClientChannelParser = require('../middleware/coapClientChannelParser.js'),
  CoAPClientPacketSend = require('../middleware/coapClientPacketSend.js'),
  CoAPMessageCreateDefaults = require('../middleware/coapMessageCreateDefaults.js'),
  CoAPServerChannelParser = require('../middleware/coapServerChannelParser.js');

const iopaClientSend = require('iopa-common-middleware').ClientSend,
  iopaMessageCache = require('iopa-common-middleware').Cache;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* *********************************************************
 * IOPA CoAP SERVER / CLIENT WITH MIDDLEWARE CONSTRUCTED
 * ********************************************************* */

const COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap", PROTOCOLVERSION: "RFC 7252"},
       packageVersion = require('../../package.json').version;

/**
 * CoAP IOPA Server includes CoAP Client
 * 
 * @class CoAPServer
 * @param {object} options  
 * @param {appFunc} appFunc  Server callback in IOPA AppFunc format
 * @constructor
 */
module.exports = function CoAPPacketApplet(app) {
   _classCallCheck(this, CoAPPacketApplet);
      
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
    app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY][IOPA.Protocol] = COAPMIDDLEWARE.PROTOCOLVERSION;

    app.use(CoAPServerChannelParser);
    app.use(CoAPClientChannelParser);
    app.use(iopaMessageCache.Match);
    app.use(CoAPMessageCreateDefaults);
    app.use(iopaClientSend);
    app.use(iopaMessageCache.Cache);
    app.use(CoAPClientPacketSend);

    }
    
    
