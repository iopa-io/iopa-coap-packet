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

global.Promise = require('bluebird');

const iopa = require('iopa'),
     udp = require('iopa-udp'),
     coap = require('./index.js'),      
     util = require('util')

const iopaMessageLogger = require('iopa-logger').MessageLogger

var app = new iopa.App();
app.use(udp);
app.use(coap);
app.use(iopaMessageLogger);

app.use(function(context, next){
   context.log.info("[DEMO] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   
   if (context["iopa.Method"] === "GET")
   {
      context.response["iopa.Body"].end("Hello World");
   }

   return next();
});
    
if (!process.env.PORT)
  process.env.PORT = iopa.constants.IOPA.PORTS.COAP;

var context, _server;
var coapClient;
_server = app.createServer("udp:");
_server.listen(process.env.PORT, process.env.IP)
  .then(function(linfo){
    console.log("[DEMO] Server is on port " + _server["server.LocalPort"]);
    return _server.connect("coap://127.0.0.1");
  })
  .then(function(cl){
    coapClient = cl;
    return coapClient.send("/projector", "GET");
    })
   .then(function(response){
       console.log("[DEMO] CoAP DEMO Response " + response["iopa.Method"] + " " + response["iopa.Body"].toString());
       return _server.close();
    }).then(function(){
       console.log("Server Closed");
    })
 ;
    