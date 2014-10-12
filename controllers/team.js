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
    Team.find({}).populate('users').exec( function (err, items) {
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
    Team.findOne({ _id : req.params.id }).populate('users').exec( function (err, item) {
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
    // Loops through Users and removes them from the team
    Team.findOne({ _id : req.params.id }, function (err, team) {
      team.users.forEach( function (user) {
        User.findByIdAndUpdate({ _id:user }, { $pull: { teams:team._id }}, function (err) {
          if (err) {
            console.log(err);
            res.send({ msg: 'User error: ' + err });
          }
        });
      });
      // Delete Team
      Team.remove({ _id : req.params.id }, function (err, result) {
        console.log(result);
        res.send((result === 1) ? { msg: '' } : { msg: 'error: ' + err });
      });
    });
  });

  /**
   * DEL /teamdeleteuser
   * JSON delete user from team api
   */

  app.delete('/teamdeleteuser', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Removes User from the team
    User.findByIdAndUpdate(req.body.user_id, { $pull: { teams:req.body.team_id }}, function (err, result) {
      if (err) {
        res.send({ msg: err });
      }
      Team.findByIdAndUpdate(req.body.team_id, { $pull: { users:req.body.user_id }}, function (err, result) {
        res.send((err === null) ? { msg: '' } : { msg: 'Team error: ' + err });
      });
    });
  });
  
  /**
   * POST /teamaddusers
   * JSON add users to team api
   */

  app.post('/teamaddusers', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    User.update({ _id: { $in: req.body.users }}, { $push: { teams:req.body.team_id }}, { multi: true }, function (err, result) {
      if (err) {
        res.send( { msg: 'error: ' + err });
      }
      Team.findByIdAndUpdate(req.body.team_id, { $pushAll: { users:req.body.users }}, function (err, result) {
        res.send((err === null) ? { msg: '' } : { msg: 'error: ' + err });
      });
    });
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
      // Get number of keys on parameters
      var size = Object.keys(req.body).length;

      // Create an array to hold the users
      // Have to process the users differently 
      // if more then 1 is checked
      var usersArray = [];
      if (size < 3) {
        for (var key in req.body ) {
          if (key === 'user') {
            usersArray.push(req.body[key]);
          }
        }
      }
      else {
        for (var user in req.body.user ) {
          usersArray.push(req.body.user[user]);
        }
      }

      // Create team
      var team = new Team({
        name:           req.body.name.trim(),
        users:          usersArray
      });
      
      // Save team
      team.save(function (err) {
        if (err) {
          if (err.code === 11000) {
            req.flash('error', { msg: 'An team with that name already exists!' });
          }
          req.flash('error', { msg: 'Could not create team!' });
          return res.redirect('back');
        } else {
          // next step, update users
          workflow.emit('updateUsers', usersArray);
        }
      });
    });

    /**
     * Step 3: Add users to the team
     */

    workflow.on('updateUsers', function (users) {
      // Loops through Users selected and updates their team field
      users.forEach( function (user) {
        User.findById(user, function (err, user) {
          if (err) {
            req.flash('error', { msg: 'Could not find User!' });
            return res.redirect('back');
          } 

          Team.findOne({ name: req.body.name }, function (err, team) {
            User.update({ _id:user._id }, { $push: { teams:team._id }}, function (err) {
              if (err) {
                req.flash('error', { msg: 'Could not add User to Team!' });
                return res.redirect('back');
              }
            });
          });
        });
      });
      
      req.flash('info', { msg: 'Your team has been successfully created.' });
      return res.redirect('/teams');
      
      // WORKFLOW COMPLETED

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
        return res.redirect('back');
      });
      
      // WORKFLOW COMPLETED

    });

    /**
     * Initiate the workflow
     */

    workflow.emit('validate');

  });

};
