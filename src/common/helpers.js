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

// Generic toBinary and fromBinary definitions
var optionToBinaryFunctions = {}
var optionFromBinaryFunctions = {}

module.exports.toBinary = function(name, value) {
  if (Buffer.isBuffer(value))
    return value

  if (!optionToBinaryFunctions[name])
    throw new Error('Unknown string to Buffer converter for option: ' + name)

  return optionToBinaryFunctions[name](value)
}

module.exports.fromBinary = function(name, value) {
  var convert = optionFromBinaryFunctions[name]

  if (!convert)
    return value

  return convert(value)
}

/*
calculate id of a payload by xor each 2-byte-block from it
use to generate etag
  payload         an input buffer, represent payload need to generate id (hash)
  id              return var, is a buffer(2)
*/
module.exports.toETag = function(payload) {
  var id = new Buffer([0,0])
  var i = 0
  do {
    id[0] ^= payload[i]
    id[1] ^= payload[i+1]
    i += 2
  } while (i<payload.length)
  return id
}

module.exports.toCode = function(code) {
  if (typeof code === 'string')
    return code

  var first  = Math.floor(code / 100)
    , second = code - first * 100
    , result = ''

  result += first + '.'

  if (second < 10)
    result += '0'

  result += second

  return result
}

var registerOption = function(name, toBinary, fromBinary) {
  optionFromBinaryFunctions[name] = fromBinary
  optionToBinaryFunctions[name] = toBinary
}

/*
get an option value from options
  options     array of object, in form {name: , value}
  name        name of the object wanted to retrive
  return      value, or null
*/
module.exports.getOption = function getOption(options, name) {
  for (var i in options)
    if (options[i].name == name)
      return options[i].value
  return null
}

module.exports.registerOption = registerOption

// ETag option registration
var fromString = function(result) {
  return new Buffer(result)
}

var toString = function(value) {
  return value.toString()
}

registerOption('ETag', fromString, toString)
registerOption('Location-Path', fromString, toString)
registerOption('Location-Query', fromString, toString)

// Content-Format and Accept options registration
var formatsString = {}
var formatsBinaries = {}

var registerFormat = function(name, value) {
  formatsString[name] = new Buffer([value])
  formatsBinaries[value] = name
}
module.exports.registerFormat = registerFormat

registerFormat('text/plain', 0)
registerFormat('application/link-format', 40)
registerFormat('application/xml', 41)
registerFormat('application/octet-stream', 42)
registerFormat('application/exi', 47)
registerFormat('application/json', 50)
registerFormat('application/json', 50)

var contentFormatToBinary = function(result) {
  result = formatsString[result]
  if (!result)
    throw new Error('Unknown Content-Format: ' + value)

  return result
}

var contentFormatToString = function(value) {
  if (value.length === 0)
    return formatsBinaries[0]
  
  if (value.length === 1)
    value = value.readUInt8(0)
  else if (value.length === 2)
    value = value.readUInt16BE(0)
  else
    throw new Error('Content-Format option is too big')

  var result = formatsBinaries[value]

  if (!result)
    throw new Error('No matching format found')

  return result
}

registerOption('Content-Format', contentFormatToBinary, contentFormatToString)
registerOption('Accept', contentFormatToBinary, contentFormatToString)
registerOption('Observe', function(sequence) {
  var buf

  if (!sequence) {
    buf = new Buffer(0)
  } else if (sequence < 256) {
    buf = new Buffer(1)
    buf.writeUInt8(sequence, 0)
  } else if (sequence >= 256 && sequence < 65535) {
    buf = new Buffer(2)
    buf.writeUInt16BE(sequence, 0)
  } else {
    // it is three bytes long
    buf = new Buffer(3)
    buf.writeUInt8(Math.floor(sequence / 65535), 0)
    buf.writeUInt16BE(sequence % 65535, 1)
  }

  return buf
}, function(buf) {
  var result = 0

  if (buf.length === 1) {
    result = buf.readUInt8(0)
  } else if (buf.length === 2) {
    result = buf.readUInt16BE(0)
  } else if (buf.length === 3) {
    result += buf.readUInt8(0) * 65353
    result += buf.readUInt16BE(1)
  }

  return result
})
