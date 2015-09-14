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

const iopa = require('iopa')
    , coap = require('./index.js')      
     , util = require('util');

const iopaMessageLogger = require('iopa-common-middleware').MessageLogger


var appServer = new iopa.App();
appServer.use(iopaMessageLogger);

appServer.use(function(context, next){
   context.log.info("[DEMO] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   
   if (context["iopa.Method"] === "GET")
   {
      context.response["iopa.Body"].end("Hello World");
   }

   return next();
});
    
var server = coap.createServer(appServer.build());
server.connectuse(iopaMessageLogger.connect);         

if (!process.env.PORT)
  process.env.PORT = iopa.constants.IOPA.PORTS.COAP;

var context;
var coapClient;
server.listen(process.env.PORT, process.env.IP)
  .then(function(){
    server.log.info("[DEMO] Server is on port " + server.port );
    return server.connect("coap://127.0.0.1");
  })
  .then(function(cl){
    coapClient = cl;
    return coapClient.send("/projector", "GET");
    })
   .then(function(response){
       server.log.info("[DEMO] CoAP DEMO Response " + response["iopa.Method"] + " " + response["iopa.Body"].toString());
       return server.close();
    }).then(function(){
       server.log.info("Server Closed");
    })
 ;
    