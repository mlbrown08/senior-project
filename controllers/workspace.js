'use strict';

/**
 * Module Dependences
 */

var passportConf  = require('../config/passport');
var fs            = require('fs');

/**
 * Workspace Controller
 */

module.exports.controller = function (app) {

 /**
   * GET /workspace*
   * *ALL* workspace routes must be authenticated first
   */

  app.all('/workspace*', passportConf.isAuthenticated);

  /**
   * GET /workspaces
   * Render Workspaces Page
   */

  app.get('/workspaces', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('workspaces/workspaces', {
      url: req.url
    });
  });

  /**
   * GET /workspace/readfile
   * Returns content of file
   */

  app.post('/workspace/readfile', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    var file = String(req.body.file);
    fs.readFile(file, function (err, data) {

      res.send((err === null) ? { msg: '', data: String(data) } : { msg: 'error' + err });
    });
  });

  /**
   * PUST /workspace/savefile
   * Saves file
   */

  app.post('/workspace/savefile', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    var content = String(req.body.text);
    var file = String(req.body.file);
    fs.writeFile(file, content, function (err) {

      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
  });
};
