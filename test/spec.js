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

const iopa = require('iopa')
    , util = require('util')
    , Events = require('events')
    , coap = require('../index.js')
     , udp = require('iopa-udp');
    
    
var should = require('should');

var numberConnections = 0;

describe('#CoAP Server()', function() {
  
  var _server, _clientSocket, coapClient;
  var app;
  var events = new Events.EventEmitter();
  
  before(function(done){
    
    app = new iopa.App();
    app.use(udp);
    app.use(coap);

    app.use(function(context, next){
      context.log.info("[TEST] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
      context.response["iopa.Body"].end("Hello World");
      setTimeout(function(){ 
          events.emit("data", context);  
      }, 40);
      return next();
        });
           
                       
  
      if (!process.env.PORT)
        process.env.PORT = 5683;
      _server=app.createServer("udp:");
      _clientSocket= app.createServer("udp:");
       _server.listen(process.env.PORT, process.env.IP)
       .then(function(linfo){
         return _clientSocket.listen()})
         .then(function(linfo){
            done();
            setTimeout(function(){ events.emit("SERVER-UDP");}, 50);
             });
    });
    
   it('should listen via UDP', function(done) {   
           _server["server.LocalPort"].should.equal(5683);
           done();
    });
    
         
   it('should connect via UDP', function (done) {
     _clientSocket.connect("coap://127.0.0.1")
       .then(function (cl) {
         coapClient = cl;
         coapClient["server.RemotePort"].should.equal(5683);
         done();
       });
   });
      
     it('should GET via CoAP', function(done) {  
        coapClient.create("/projector", "GET").send()
        .then(function(response) {
           response["iopa.Method"].should.equal('2.05');
           response["iopa.Body"].toString().should.equal('Hello World');
           done();     
           });   
    });
    
    it('should respond with state via CoAP', function(done) {
       events.on("data", function(context){
           done();
           });
    });

   it('should close', function(done) {
       _server.close().then(function(){
         return _clientSocket.close()})
         .then(function(){
         app.log.info("[TEST] CoAP Closed");
         done();});
    });
    
});
