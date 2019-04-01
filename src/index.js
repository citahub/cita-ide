'use strict'

require('babel-polyfill')
var App = require('./app.js')
const loadContractSamples = require('./loadContractSamples')

var app = new App({})

document.body.appendChild(app.render())
if (window.remix) {
  window.remix.cita = {
    contracts: {},
    helpers: {}
  }
}

app.init() // @TODO: refactor to remove
loadContractSamples()