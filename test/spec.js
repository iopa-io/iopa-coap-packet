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
  
  var server, coapClient;
  var events = new Events.EventEmitter();
  
  before(function(done){
    
    var appServer = new iopa.App();
    appServer.use(coap);

    appServer.use(function(context, next){
      context.log.info("[TEST] SERVER CoAP DEMO " + context["iopa.Method"] + " " + context["iopa.Path"]);
      context.response["iopa.Body"].end("Hello World");
      setTimeout(function(){ 
          events.emit("data", context);  
      }, 40);
      return next();
        });
           
                       
    server = udp.createServer(appServer.build());
   
      if (!process.env.PORT)
        process.env.PORT = 5683;
      
       server.listen(process.env.PORT, process.env.IP).then(function(){
            done();
            setTimeout(function(){ events.emit("SERVER-UDP");}, 50);
             });
    });
    
   it('should listen via UDP', function(done) {   
           server.port.should.equal(5683);
           done();
    });
    
         
   it('should connect via UDP', function (done) {
     server.connect("coap://127.0.0.1")
       .then(function (cl) {
         coapClient = cl;
         coapClient["server.RemotePort"].should.equal(5683);
         done();
       });
   });
      
     it('should GET via CoAP', function(done) {  
        coapClient.send("/projector", "GET")
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

   /* it('should close', function(done) {
       server.close().then(function(){
         server.log.info("[TEST] CoAP Closed");
         done();});
    });*/
    
});
