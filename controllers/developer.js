'use strict';

/**
 * Module Dependencies
 */

var User          = require('../models/User');
var Project       = require('../models/Project');
var Team          = require('../models/Team');
var passportConf  = require('../config/passport');
var fs            = require('fs');
var socket        = require('socket.io');
var config        = require('../config/config');
var Docker        = require('dockerode');

// Docker Connection
var docker        = new Docker({ host: config.docker.host, port: config.docker.port }); 

/**
 * Admin Pages Controller
 */

module.exports.controller = function (app) {

 /**
   * GET /developer*
   * *ALL* developer routes must be authenticated first
   */

  app.all('/developer*', passportConf.isAuthenticated);

  /**
   * GET /developer/dashboard
   * Render Developers Dashboard Page
   */

  app.get('/developer/dashboard', passportConf.isAuthenticated, function (req, res) {
    res.render('developer/dashboard', {
      url: '/dashboard'
    });
  });

  /**
   * GET /developer/workspace
   * Render Developers Workspace Page
   */

  app.get('/developer/workspace', passportConf.isAuthenticated, function (req, res) {
    res.render('developer/workspace', {
      url: req.url,
    });
  });

}
