'use strict';

/**
 * Module Dependences
 */

var config          = require('../config/config');
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
   * POST /workspace/createuserdir
   * Creates User Directory to be mounted in Workspace
   */

  app.post('/workspace/createuserdir', passportConf.isAuthenticated, function (req, res) {
    var userPath = String(req.body.path);
    var dirs = userPath.split('/');
    var basePath = config.userDataLocation;
    var err = '';

    dirs.forEach( function (dir) {
      basePath += dir + '/';
      try {
        fs.mkdirSync(basePath);
      }
      catch(e) {
        if( e.code != 'EEXIST' ) {
          var err = 'Uncaught Error';
        }
      }
    });
    
    res.send((err === '') ? { msg: ''} : { msg: 'error' + err });
  });

  /**
   * POST /workspace/createfile
   * Creates an empty file
   */

  app.post('/workspace/createfile', passportConf.isAuthenticated, function (req, res) {
    var file = String(req.body.file);
    fs.open(file, 'w+', function (err, data) {

      res.send((err === null) ? { msg: '', data: String(data) } : { msg: 'error' + err });
    });
  });

  /**
   * POST /workspace/createfolder
   * Creates an empty folder
   */

  app.post('/workspace/createfolder', passportConf.isAuthenticated, function (req, res) {
    var file = String(req.body.file);
    console.log(file);
    var err = '';
    try {
      fs.mkdirSync(file);
    }
    catch(e) {
      if( e.code != 'EEXIST' ) {
        err = 'Uncaught Error';
      }
      else { 
        err = 'File Already Exits';
      }
    }

    res.send((err !== null) ? { msg: '' } : { msg: 'error' + err });
  });

  /**
   * POST /workspace/deletefile
   * Removes a file
   */

  app.post('/workspace/deletefile', passportConf.isAuthenticated, function (req, res) {
    var file = String(req.body.file);
    fs.unlink(file, function (err, data) {

      res.send((err === null) ? { msg: '', data: String(data) } : { msg: 'error' + err });
    });
  });

  /**
   * POST /workspace/deletefolder
   * Removes a file
   */

  app.post('/workspace/deletefolder', passportConf.isAuthenticated, function (req, res) {
    var file = String(req.body.file);

    deleteFolder(file);

    res.send({ msg: '' });
  });

  /**
   * POST /workspace/readfile
   * Returns content of file
   */

  app.post('/workspace/readfile', passportConf.isAuthenticated, function (req, res) {
    var file = String(req.body.file);
    fs.readFile(file, function (err, data) {

      res.send((err === null) ? { msg: '', data: String(data) } : { msg: 'error' + err });
    });
  });

  /**
   * POST /workspace/savefile
   * Saves file
   */

  app.post('/workspace/savefile', passportConf.isAuthenticated, function (req, res) {
    var content = String(req.body.text);
    var file = String(req.body.file);
    fs.writeFile(file, content, function (err) {

      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
  });

  /**
   * POST /workspace/readfile
   * Returns files in current directory
   */

  app.post('/workspace/listfiles', passportConf.isAuthenticated, function (req, res) {
    var dir = String(req.body.id);
    var userDir = String(req.body.userDir);

    var files_ = files_ || [];
    if( typeof files_ === undefined ) files_ =  [];

    if(dir == '#' )
    {
        dir = userDir;
        var paths = userDir.split('/');
        var stats = fs.statSync( userDir );
        var file = {
          id: userDir,
          text: paths[paths.length -1 ],
          icon: stats.isDirectory() ? 'fa fa-folder' : 'fa fa-file-o',
          state: {
            opened: true,
            disabled: false,
            selected: false
          },
          li_attr: {
            base: userDir,
            isLeaf: !stats.isDirectory()
          },
          children: stats.isDirectory()
        };
        files_.push(file);

    }

    var files = fs.readdirSync(dir) 
    for( var i in files) {
      var path = dir + '/' + files[i];
      var stats = fs.statSync( path );
      var file = {
        id: path,
        text: files[i],
        icon: stats.isDirectory() ? 'fa fa-folder' : 'fa fa-file-o',
        state: {
          opened: false,
          disabled: false,
          selected: false
        },
        li_attr: {
          base: path,
          isLeaf: !stats.isDirectory()
        },
        children: stats.isDirectory()
      };
      files_.push(file);
    }

    res.json(files_);
  });
};

var deleteFolder = function(path) {
  if( fs.existsSync(path)) {  
    fs.readdirSync(path).forEach( function( file, index) {
      var currentPath = path + '/' + file;
      if( fs.statSync(currentPath).isDirectory()) {
        deleteFolder(currentPath);
      }
      else {
        fs.unlinkSync(currentPath);
      }
    });
    fs.rmdirSync(path);
  }
};
