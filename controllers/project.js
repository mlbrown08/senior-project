'use strict';

/**
 * Module Dependences
 */

var Team          = require('../models/Team');
var User          = require('../models/User');
var Project          = require('../models/Project');
var passportConf  = require('../config/passport');


/**
 * Account Controller
 */

module.exports.controller = function (app) {

 /**
   * GET /project*
   * *ALL* project routes must be authenticated first
   */

  app.all('/project*', passportConf.isAuthenticated);

  /**
   * GET /project
   * Render Projects Page
   */

  app.get('/projects', function (req, res) {
    res.render('project/projects', {
      url: req.url
    });
  });
  
  /**
   * GET /projectlist
   * JSON projects api
   */

  app.get('/projectlist', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    Project.find({}).populate('teams').exec( function (err, items) {
      if (err) {
        return (err, null);
      }
      res.json(items);
    });
  });

  /**
   * GET /projectlist/:id
   * JSON specefic project api
   */

  app.get('/projectlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    Project.findOne({ _id : req.params.id }).populate('users').exec( function (err, item) {
      if (err) {
        return (err, null);
      }
      res.json(item);
    });
  });
  
  /**
   * DEL /projectlist/:id
   * JSON projects delete api
   */

  app.delete('/projectlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Find Project to delete
    Project.findById(req.params.id, function (err, project) {
      // Loops through Teams and removes the teams from the project
      project.teams.forEach( function (team) {
        Team.findByIdAndUpdate({ _id:team }, { $pull: { projects:project._id }}, function (err) {
          if (err) {
            return res.send({ msg: err });
          }
        });
      });

      // Remove Project from Users
      User.find({ projects:project._id }, function (err, users) {
        users.forEach( function (user) {
          user.update({ $pull: { projects:project._id }}, function (err) {
            if (err) {
              return res.send({ msg: err });
            }
          });
        });
      });

      // Delete Project
      Project.remove({ _id:project._id },  function (err, result) {
        console.log(result);
        res.send((result === 1) ? { msg: '' } : { msg: 'error: ' + err });
      });
    });
  });

  /**
   * GET project/create
   * Render Create Project page
   */

  app.get('/project/create', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('project/create', {
      url: req.url
    });
  });

  /**
   * POST project/create
   * Process create project
   */

  app.post('/project/create', function (req, res, next) {

    // Begin a workflow
    var workflow = new (require('events').EventEmitter)();

    /**
     * Step 1: Validate the form fields
     */

    workflow.on('validate', function () {

      // Check for form errors
      req.assert('name', 'Project name cannot be empty.').notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        req.flash('error', errors);
        return res.redirect('back');
      }

      // next step
      workflow.emit('createProject');
    });

    /**
     * Step 2: Create a new project
     */

    workflow.on('createProject', function () {
      // Create project
      var project = new Project({
        name: req.body.name.trim(),
        'docker_opts.image': req.body.image.trim(),
        'docker_opts.cmd': req.body.cmd.trim(),
        'docker_opts.container_port': req.body.containerPort.trim(),
        'docker_opts.host_port': req.body.hostPort.trim(),
      });
      
      // Save project
      project.save(function (err) {
        if (err) {
          if (err.code === 11000) {
            req.flash('error', { msg: 'A project with that name already exists!' });
          }
          req.flash('error', { msg: 'Could not create project!' });
          return res.redirect('back');
        }
      });

      req.flash('info', { msg: 'Your project has been successfully created.' });
      return res.redirect('/projects');
      
      // WORKFLOW COMPLETED

    });

    /**
     * Initiate the workflow
     */

    workflow.emit('validate');

  });

  /**
   * GET project/update
   * Render Update Project page
   */

  app.get('/project/update?:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('project/update', {
      url: req.url
    });
  });

  /**
   * POST project/update
   * Process update project
   */

  app.post('/project/update', function (req, res, next) {

    // Begin a workflow
    var workflow = new (require('events').EventEmitter)();

    /**
     * Step 1: Validate the form fields
     */

    workflow.on('validate', function () {

      // Check for form errors
      req.assert('name', 'Project name cannot be empty.').notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        req.flash('error', errors);
        return res.redirect('back');
      }

      // next step
      workflow.emit('updateProject');
    });

    /**
     * Step 2: Update the project
     */

    workflow.on('updateProject', function () {
      Project.findById(req.body.projectId, function (err, project) {
        project.name = req.body.name.trim();
        project.docker_opts.image = req.body.image.trim();
        project.docker_opts.cmd = req.body.cmd.trim();
        project.docker_opts.container_port = req.body.containerPort.trim();
        project.docker_opts.host_port = req.body.hostPort.trim();
      
        // Save project
        project.save(function (err) {
          if (err) {
            if (err.code === 11000) {
              req.flash('error', { msg: 'A project with that name already exists!' });
            }
            req.flash('info', { msg: err });
            return res.redirect('back');
          }
        });
      
        req.flash('info', { msg: 'Your project has been successfully updated.' });
        return res.redirect('/projects');
      });
      
      // WORKFLOW COMPLETED

    });

    /**
     * Initiate the workflow
     */

    workflow.emit('validate');

  });

};
