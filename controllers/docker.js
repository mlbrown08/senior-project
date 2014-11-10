'use strict';

/**
 * Module Dependences
 */

var passportConf  = require('../config/passport');
var config        = require('../config/config');
var Docker        = require('dockerode');
var io            = require('socket.io');


// Docker Connection
var docker        = new Docker({ host: config.docker.host, port: config.docker.port }); 

/**
 * Docker Controller
 */

module.exports.controller = function (app) {

 /**
   * GET /docker*
   * *ALL* docker routes must be authenticated first
   */

  app.all('/docker*', passportConf.isAuthenticated);

  /**
   * GET /images
   * JSON images api
   */

  app.get('/docker/images', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    docker.listImages(function (err, images) {
      if (err) {
        return (err, null);
      }
      res.json(images);
    });
  });

  /**
   * GET /dockercontainers
   * JSON containers api
   */

  app.get('/docker/containers', passportConf.isAuthenticated, function (req, res) {
    docker.listContainers({ all:true }, function (err, containers) {
      if (err) {
        return (err, null);
      }
      res.json(containers);
    });
  });

  /**
   * DEL /dockerdeleteimages/:name
   * JSON docker image delete api
   */

  app.delete('/docker/deleteimage', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Name of image to be removed
    var name = req.body.name;

    // Get the image
    var image = docker.getImage(name);
    
    // Remove image
    image.remove(function (err, result) {
      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
      
  });

  /**
   * GET /dockerstartcontainer
   * JSON startcontainer api
   */

  app.post('/docker/createcontainer', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Dictionay for Volumes
    var volumes = {};
    var mountPoint = '';
    if (req.body.volume !== '') {
      mountPoint = req.body.volume.split(':')[1];
      volumes[mountPoint] = {};
    }
    else {
      volumes = null;
    }


    // Create container options  
    var createOpts = {
      Image:req.body.image,
      Cmd:req.body.cmd.split(' '),
      name:req.body.name,
      Tty:req.body.tty,
      // If tty is true open streams
      AttachStderr:(req.body.tty === 'true') ? true : false,
      AttachStdin:(req.body.tty === 'true') ? true : false,
      AttachStdout:(req.body.tty === 'true') ? true : false,
      OpenStdin:(req.body.tty === 'true') ? true : false,
      StdinOnce:(req.body.tty === 'true') ? true : false,
      Volumes:volumes,
      WorkingDir:mountPoint
    };
    
    // Dictionary for out Ports
    var ports = {};
    ports[req.body.containerPort] = [{ HostPort:req.body.hostPort }];
    
    // Start container options
    var startOpts = {
      PortBindings: ports,
      Binds:(req.body.volume === '') ? null : [req.body.volume]
    };

    docker.createContainer(createOpts, function (err, container) {
      container.start(startOpts, function (err, data) {
        res.send((err === null) ? { msg: '', Id: container.id} : { msg: 'error' + err });
      });
    });
  });

  /**
   * GET /dockerinspectcontainer/:id
   * JSON inspect docker container api
   */

  app.get('/docker/inspectcontainer/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Id of container to be started
    var id = req.params.id;

    // Get the container
    var container = docker.getContainer(id);
    
    // Inpsect Container
    container.inspect(function (err, container) {
      if (err) {
        return (err, null);
      }
      res.json(container);
    });
  });

  /**
   * POST /dockerstartcontainer/:id
   * JSON start docker container api
   */

  app.post('/docker/startcontainer/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Id of container to be started
    var id = req.params.id;

    // Get the container
    var container = docker.getContainer(id);
    
    // Start Container
    container.start(function (err, result) {
      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
  });

  /**
   * POST /dockerstopcontainer/:id
   * JSON stop docker container api
   */

  app.post('/docker/stopcontainer/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Id of container to be stopped
    var id = req.params.id;

    // Get the container
    var container = docker.getContainer(id);
    
    // Restart Container
    container.stop(function (err, result) {
      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
  });

  /**
   * DEL /dockerremovecontainer/:id
   * JSON remove docker container api
   */

  app.delete('/docker/removecontainer/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Id of container to be restarted
    var id = req.params.id;

    // Get the container
    var container = docker.getContainer(id);
    
    // Remove Container
    container.remove(function (err, result) {
      res.send((err === null) ? { msg: '' } : { msg: String(err) });
    });
  });

  /**
   * POST /dockerrestartcontainer/:id
   * JSON restart docker container api
   */

  app.post('/docker/restartcontainer/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Id of container to be restarted
    var id = req.params.id;

    // Get the container
    var container = docker.getContainer(id);
    
    // Restart Container
    container.restart(function (err, result) {
      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
  });

  /**
   * POST /dockercontainerlogs/:id
   * Get cotainers logs
   */

  app.post('/docker/containerlogs', passportConf.isAuthenticated, function (req, res) {
    // Get reference to Websocket Server
    var io = req.app.get('io');

    // Id of container
    var id = req.body.id;

    // Get the container
    var container = docker.getContainer(id);

    // Log Options
    var log_opts = {stdin:true, stdout:true, stderr: true, logs: true};

    // Get Logs
    container.logs(log_opts, function (err, stream) {
      stream.on('data', function (chunk) {
        var str = chunk.toString('utf-8');
 
        // Send Data to Websocket Client
        io.emit('data', { data: str });
      });
      res.send((err === null) ? { msg: '' } : { msg: 'error' + err });
    });
  });

};
