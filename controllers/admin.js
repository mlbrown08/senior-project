'use strict';

/**
 * Module Dependencies
 */

var User          = require('../models/User');
var Project       = require('../models/Project');
var Team          = require('../models/Team');
var passportConf  = require('../config/passport');
var config        = require('../config/config');
var Docker        = require('dockerode');

// Docker Connection
var docker        = new Docker({ host: config.docker.host, port: config.docker.port }); 

/**
 * Admin Pages Controller
 */

module.exports.controller = function (app) {

  /**
   * GET /dashboard
   * Render Dashboard Page
   */

  app.get('/dashboard', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Get User Counts
    User.count({}, function (err, accountCount) {
      if (err) {
        return (err, null);
      }

      // Get Project Counts
      Project.count({}, function (err, projectCount) {
        if (err) {
          return (err, null);
        }

        // Get Project Counts
        Team.count({}, function (err, teamCount) {
          if (err) {
            return (err, null);
          }
          
          // Get Workspaces Count
          docker.listContainers({ all:true }, function (err, containers) {
            if (err) {
              return (err, null);
            }
            
            // Get Workspaces Count
            docker.listImages( function (err, images) {
              if (err) {
                return (err, null);
              }

              res.render('admin/dashboard', {
                url: '/dashboard',  // to set navbar active state
                accounts: accountCount,
                projects: projectCount,
                teams: teamCount,
                workspaces: containers.length,
                images: images.length
              });
            });
          });
        });
      });
    });
  });

  /**
   * GET /accounts
   * Render accounts page
   */

  app.get('/accounts', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('admin/accounts', {
      token: res.locals.token,
      url: req.url
    });
  });

  /**
   * GET /accountlist
   * JSON accounts api
   */

  app.get('/accountlist', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    User.find({}, function (err, items) {
      if (err) {
        return (err, null);
      }
      res.json(items);
    });
  });

  /**
   * GET /accountlist/:id
   * JSON accounts on specific proejct api
   */

  app.get('/accountlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    User.find({projects: req.params.id}, function (err, items) {
      if (err) {
        return (err, null);
      }
      res.json(items);
    });
  });

  /**
   * GET /accountinfo/:id
   * JSON account information api
   */

  app.get('/accountinfo/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    User.findById(req.params.id, function (err, items) {
      if (err) {
        return (err, null);
      }
      res.json(items);
    });
  });
  /**
   * DEL /accountlist/:id
   * JSON accounts delete api
   */

  app.delete('/accountlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    // Find User to be deleted
    User.findById(req.params.id, function (err, user) {
      // Remove User from their Team
      user.teams.forEach( function (team) {
        Team.findByIdAndUpdate(team, { $pull: { users:user._id }}, function (err) {
          if (err) {
            return res.send({ msg: err });
          }
        });
      });

      // Remove User
      User.remove({ _id:req.params.id }, function (err, result) {
        res.send((result === 1) ? { msg: '' } : { msg: 'error: ' + err });
      });
    });
  });

    /**
   * GET /dashboard
   * Render Dashboard Page
   */

  app.get('/colors', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('admin/colors', {
      url: '/administration'  // to set navbar active state
    });
  });

};
