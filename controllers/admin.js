'use strict';

/**
 * Module Dependencies
 */

var User          = require('../models/User');
var Team          = require('../models/Team');
var passportConf  = require('../config/passport');

/**
 * Admin Pages Controller
 */

module.exports.controller = function (app) {

  /**
   * GET /dashboard
   * Render Dashboard Page
   */

  app.get('/dashboard', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    User.count({}, function (err, count) {
      if (err) {
        return (err, null);
      }
      res.render('admin/dashboard', {
        url: '/administration',  // to set navbar active state
        accounts: count
      });
    });
  });

  /**
   * GET /accounts
   * Render accounts page
   */

  app.get('/accounts', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
    res.render('admin/accounts', {
      url: '/administration', // to set navbar active state
      token: res.locals.token
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
   * JSON specefic account api
   */

  app.get('/accountlist/:id', passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
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
