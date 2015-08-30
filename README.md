# [![IOPA](http://iopa.io/iopa.png)](http://iopa.io)<br> iopa-coap-packet

[![Build Status](https://api.shippable.com/projects/55e30b7a1895ca447410e53a/badge?branchName=master)](https://app.shippable.com/projects/55e30b7a1895ca447410e53a) 
[![IOPA](https://img.shields.io/badge/iopa-middleware-99cc33.svg?style=flat-square)](http://iopa.io)
[![limerun](https://img.shields.io/badge/limerun-certified-3399cc.svg?style=flat-square)](https://nodei.co/npm/limerun/)

[![NPM](https://nodei.co/npm/iopa-coap-packet.png?downloads=true)](https://nodei.co/npm/iopa-coap-packet/)

## About
`iopa-coap-packet` is a lightweight Constrained Application Protocol (CoAP) packet transport, based on the Internet of Protocols Association (IOPA) open standard  

It translates CoAP packets to and from standard IOPA format.

It is not intended as a standalone CoAP server, as it does not contain the standard protocol logic for acknowledges, observes etc., but can form the basis for one.  See [`iopa-coap`](https://github.com/iopa-source/iopa-coap) for an open-source, standards-based, drop-in replacement for CoAP servers such as [`node-coap`](https://github.com/mcollina/node-coap).   

`iopa-coap-packet` uses the widely used library ['coap-packet'](https://github.com/mcollina/coap-packet) for protocol formatting.

Written in plain javascript for maximum portability to constrained devices

Makes CoAP messages look to an application just like an HTTP message so little or no application changes required to support multiple REST protocols

## Status

Fully working prototype include server and client.

Includes:


### Server Functions

  * Layered protocol based on native UDP sockets
  * Translation from UDP Raw Message to CoAP Packet in standard IOPA format, compatible with all HTTP and COAP applications including those written for Express, Connect, etc!
   
### Client Functions
  * Layered protocol based on native UDP sockets
  * Translation from CoAP Packet in standard IOPA
   format to CoAP Raw Message
   
## Installation

    npm install iopa-coap-packet

## Usage
    
### Simple Hello World Server and Client
``` js
const iopa = require('iopa')
    , coap = require('iopa-coap-packet')      

var appServer = new iopa.App();

appServer.use(function(context, next){
   context.log.info("[DEMO] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   
   if (context["iopa.Method"] === "GET")
   {
      context.response["iopa.Body"].end("Hello World");
   }

   return next();
    });
    
    
var appClient = new iopa.App();

appClient.use(function(context, next){
   context.log.info("[DEMO] CLIENT CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   return next();
    });
                       
var server = coap.createServer({}, appServer.build(), appClient.build());

server.listen(process.env.PORT, process.env.IP)
  .then(function(){
    server.log.info("[DEMO] Server is on port " + server.port );
    return server.connect("coap://127.0.0.1");
  })
  .then(function(coapClient){
    var context = coapClient["server.CreateRequest"]("/device", "GET");
    return context.send();
    })
   .then(function(response){
       server.log.info("[DEMO] CoAP DEMO Response " + response["iopa.Method"] + " " + response["iopa.Body"].toString());
    })
 ;
``` 

### Multicast and UniCast Server Client Example
``` js
const iopa = require('iopa')
    , coap = require('iopa-coap-packet')      
    , Promise = require('bluebird')

var appServer = new iopa.App();

appServer.use(function(context, next){
   context.log.info("[DEMO] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   
   if (context["iopa.Method"] === "GET")
   {
      context.response["iopa.Body"].end("Hello World");
   }

   return next();
    });
    
    
var appClient = new iopa.App();

appClient.use(function(context, next){
   context.log.info("[DEMO] CLIENT CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
   return next();
    });
                       
var server = coap.createServer({}, appServer.build(), appClient.build());
    
var serverOptions = {
    "server.LocalPortMulticast" : coap.constants.coapMulticastIPV4
  , "server.LocalPortReuse" : true
  , "server.IsGlobalClient" : false
}

var server = coap.createServer(serverOptions, app.build());

Promise.join( server.listen(process.env.PORT, process.env.IP)).then(function(){
   server.log.info("Server is on port " + server.port );
  
   server.clientCreateRequest('coap://127.0.0.1:' + server.port + '/device', "GET")
   .then(function(context) {
    context.response["iopa.Body"].pipe(process.stdout);
    context["iopa.Body"].end("Hello World");
   });
});
``` 
  
## Roadmap

Adding additional features of the protocol such as Type 2 Blocks, is as simple as adding a new middleware function (10-30 lines of javascript)  

 