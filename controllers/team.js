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
   * GET /team*
   * *ALL* team routes must be authenticated first
   */

  app.all('/team*', passportConf.isAuthenticated);

  /**
   * GET /team
   * Render Teams Page
   */

  app.get('/teams', function (req, res) {
    res.render('team/teams', {
      url: req.url
    });
  });
  
  /**
   * GET /teamlist
   * JSON accounts api
   */

  app.get('/teamlist', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    Team.find({}).populate('users projects').exec( function (err, items) {
      if (err) {
        return (err, null);
      }
      res.json(items);
    });
  });

  /**
   * GET /teamlist/:id
   * JSON specefic team api
   */

  app.get('/teamlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    Team.findById(req.params.id).populate('users projects').exec( function (err, item) {
      if (err) {
        return (err, null);
      }
      res.json(item);
    });
  });
  
  /**
   * DEL /teamlist/:id
   * JSON teams delete api
   */

  app.delete('/teamlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    Team.findById(req.params.id, function (err, team) {
      // Loops through Users and removes them from the team
      team.users.forEach( function (user) {
        User.findByIdAndUpdate(user, { $pull: { teams:team._id }, $pullAll: { projects:team.projects }}, function (err) {
          if (err) {
            return res.send({ msg: err });
          }
        });
      });

      // Loops through the Projects and removes them from the team
      team.projects.forEach( function (project) {
        Project.findByIdAndUpdate(project, { $pull: { teams:team._id }}, function (err) {
          if (err) {
            return res.send({ msg: err });
          }
        });
      });

      // Delete Team
      Team.remove({ _id : req.params.id }, function (err, result) {
        res.send((result === 1) ? { msg: '' } : { msg: 'error: ' + err });
      });
    });
  });

  /**
   * DEL /teamdeleteuser
   * JSON delete user from team api
   */

  app.delete('/teamdeleteuser', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Removes User from the Team
    Team.findByIdAndUpdate(req.body.team_id, { $pull: { users:req.body.user_id }}, function (err, team) {
      if (err) {
        res.send({ msg: err });
      }
      User.findByIdAndUpdate(req.body.user_id, { $pull: { teams:req.body.team_id }, $pullAll: { projects: team.projects }}, function (err, result) {
        res.send((err === null) ? { msg: '' } : { msg: 'Team error: ' + err });
      });
    });
  });
  
  /**
   * POST /teamaddusers
   * JSON add users to team api
   */

  app.post('/teamaddusers', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Adds Users to the Team
    Team.findByIdAndUpdate(req.body.team_id, { $pushAll: { users:req.body.users }}, function (err, team) {
      if (err) {
        return res.send( { msg: 'error: ' + err });
      }
      User.update({ _id: { $in: req.body.users }}, { $push: { teams:req.body.team_id }, $pushAll: { projects:team.projects }}, { multi: true }, function (err, result) {
        res.send((err === null) ? { msg: '' } : { msg: 'error: ' + err });
      });
    });
  });

  /**
   * DEL /teamdeleteproject
   * JSON delete project from team api
   */

  app.delete('/teamdeleteproject', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Removes Project from the Team
    Project.findByIdAndUpdate(req.body.project_id, { $pull: { teams:req.body.team_id }}, function (err, result) {
      if (err) {
        return res.send({ msg: err });
      }
      Team.findByIdAndUpdate(req.body.team_id, { $pull: { projects:req.body.project_id }}, function (err, result) {
        if (err) {
          return res.send({ msg: err });
        }
      });
      // Loops through the Users of the Team and removes the Project from them
      Team.findById(req.body.team_id, function (err, team) {
        var users = team.users;
        users.forEach( function (user) {
          User.findByIdAndUpdate(user, { $pull: { projects:req.body.project_id }}, function (err) {
            if (err) {
              return res.send({ msg: err });
            }
          });
        });
      });
    });
    // Everything delete and update correctly so return success
    return res.send({ msg: '' });
  });
  
  /**
   * POST /teamaddprojects
   * JSON add projects to team api
   */

  app.post('/teamaddprojects', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    Project.update({ _id: { $in: req.body.projects }}, { $push: { teams:req.body.team_id }}, { multi: true }, function (err, result) {
      if (err) {
        return res.send( { msg: 'error: ' + err });
      }
      Team.findByIdAndUpdate(req.body.team_id, { $pushAll: { projects:req.body.projects }}, function (err, result) {
        if (err) {
          return res.send( { msg: 'error: ' + err });
        }
      });
      // Loops through the Users of the Team and add the Project to them
      Team.findById(req.body.team_id , function (err, team) {
        var users = team.users;
        users.forEach( function (user) {
          User.update({ _id:user }, { $pushAll: { projects:req.body.projects }}, function (err) {
            if (err) {
              return res.send( { msg: 'error: ' + err });
            }
          });
        });
      });
    });
    // Everything Add and update correctly so return success
    return res.send({ msg: '' });
  });

  /**
   * GET team/create
   * Render Create Team page
   */

  app.get('/team/create', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('team/create', {
      url: req.url
    });
  });

  /**
   * POST team/create
   * Process create team
   */

  app.post('/team/create', function (req, res, next) {

    // Begin a workflow
    var workflow = new (require('events').EventEmitter)();

    /**
     * Step 1: Validate the form fields
     */

    workflow.on('validate', function () {

      // Check for form errors
      req.assert('name', 'Team name cannot be empty.').notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        req.flash('error', errors);
        return res.redirect('back');
      }

      // next step
      workflow.emit('createTeam');
    });

    /**
     * Step 2: Create a new team
     */

    workflow.on('createTeam', function () {
      // Variables to hold users and projects count
      var userCount = 0;
      var projectCount = 0;

      // Note - If the is only 1 user or project the value with be 24
      // because it the treats the value as an array with 24 characters
      for (var key in req.body ) {
        if (key === 'user') {
          userCount = req.body.user.length;
        }
        else if (key === 'project') {
          projectCount = req.body.project.length;
        }
      }

      // Create an array to hold the users
      // Have to process the users differently 
      // if more then 1 is checked
      var usersArray = [];
      if (userCount === 0) {
        usersArray.push(null);
      }
      else if (userCount === 24) { // Remember this is really one user
        usersArray.push(req.body.user);
      }
      else {
        usersArray = req.body.user;
      }
      
      // Create an array to hold the projects
      // Have to process the users differently 
      // if more then 1 is checked
      var projectsArray = [];
      if (userCount === 0) {
        usersArray.push(null);
      }
      else if (projectCount === 24) { // Remeber this is really on user
        projectsArray.push(req.body.project);
      }
      else {
        projectsArray = req.body.project;
      }
      
      // Create team
      var team = new Team({
        name: req.body.name.trim(),
        users: usersArray,
        projects: projectsArray
      });
      
      // Save team
      team.save(function (err) {
        if (err) {
          if (err.code === 11000) {
            req.flash('error', { msg: 'An team with that name already exists!' });
          }
          req.flash('error', { msg: 'Could not create team!' });
          return res.redirect('back');
        }
      });

      // next step, update users and projects
      if (userCount > 0) {
        workflow.emit('updateUsers', usersArray, projectsArray);
      }
      if (projectCount > 0) {
        workflow.emit('updateProjects', projectsArray);
      }

      req.flash('info', { msg: 'Your team has been successfully created.' });
      return res.redirect('/teams');
      
      // WORKFLOW COMPLETED
    });

    /**
     * Step 3: Add users to the team
     */

    workflow.on('updateUsers', function (users, projects) {
      // Loops through Users selected and add them to the Team
      users.forEach( function (user) {
        User.findById(user, function (err, user) {
          if (err) {
            req.flash('error', { msg: 'Could not find User!' });
            return res.redirect('back');
          } 

          Team.findOne({ name: req.body.name }, function (err, team) {
            user.update( { $push: { teams:team._id }, $pushAll: { projects:projects }}, function (err) {
              if (err) {
                req.flash('error', { msg: 'Could not add User to Team!' });
                return res.redirect('back');
              }
            });
          });
        });
      });
    });

    /**
     * Step 4: Add projects to the team
     */

    workflow.on('updateProjects', function (projects) {
      // Loops through Projects selected and adds them to the Team
      projects.forEach( function (project) {
        Project.findById(project, function (err, project) {
          if (err) {
            req.flash('error', { msg: 'Could not find Project!' });
            return res.redirect('back');
          } 

          Team.findOne({ name: req.body.name }, function (err, team) {
            project.update({ $push: { teams:team._id }}, function (err) {
              if (err) {
                req.flash('error', { msg: 'Could not add Project to Team!' });
                return res.redirect('back');
              }
            });
          });
        });
      });
    });

    /**
     * Initiate the workflow
     */

    workflow.emit('validate');

  });

  /**
   * GET team/update
   * Render Update Team page
   */

  app.get('/team/update?:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('team/update', {
      url: req.url
    });
  });

  /**
   * POST team/update
   * Process update team
   */

  app.post('/team/update', function (req, res, next) {

    // Begin a workflow
    var workflow = new (require('events').EventEmitter)();

    /**
     * Step 1: Validate the form fields
     */

    workflow.on('validate', function () {

      // Check for form errors
      req.assert('name', 'Team name cannot be empty.').notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        req.flash('error', errors);
        return res.redirect('back');
      }

      // next step
      workflow.emit('updateTeam');
    });

    /**
     * Step 2: Update the team
     */

    workflow.on('updateTeam', function () {
      Team.findById(req.body.teamId, function (err, team) {
        team.name = req.body.name.trim();
      
        // Save team
        team.save(function (err) {
          if (err) {
            if (err.code === 11000) {
              req.flash('error', { msg: 'An team with that name already exists!' });
            }
            req.flash('info', { msg: err });
            return res.redirect('back');
          }
        });
      
        req.flash('info', { msg: 'Your team has been successfully updated.' });
        return res.redirect('/teams');
      });
      
      // WORKFLOW COMPLETED

    });

    /**
     * Initiate the workflow
     */

    workflow.emit('validate');

  });

};
