'use strict';
/*global describe*/
/*global before*/
/*global it*/

/**
 * Module Dependencies
 */

var should  = require('chai').should();
var Team    = require('../models/Team');
var User    = require('../models/User');
var Project    = require('../models/Project');
var team;

var mongoose = require('mongoose');
var config = require('../config/config');
mongoose.connect(config.mongodb.url);


/**
 * Test Team Model
 */

describe('Team attributes', function () {

  before(function (done) {
    var userArray = [];
    var projectArray = [];
    User.find({}).limit(5).exec(function (err, users) {
      users.forEach(function (user) {
        userArray.push(user._id);
      });

      Project.find({}).limit(1).exec(function (err, projects) {
        projects.forEach(function (project) {
            projectArray.push(project._id);
        });
    
        team = new Team({
          name: 'Testing Team',
          users: userArray,
          projects: projectArray
        });
        done();
      });
    });
  });

  it('name should be a string', function () {
    team.name.should.be.a('string');
  });

  it('users should be an array of object ids', function () {
    team.users.forEach(function (user) {
        user.should.be.instanceof(mongoose.Types.ObjectId);
    });
  });

  it('projects should be an array of object ids', function () {
    team.projects.forEach(function (project) {
        project.should.be.instanceof(mongoose.Types.ObjectId);
    });
  });

  it('should save a team', function (done) {
    team.save(function (err) {
      if (err) {
        throw (err);
      }
      done();
    });
  });

  it('should find our newly created team', function (done) {
    Team.findOne({ name: team.name }, function (err, user) {
      should.exist(team);
      team.name.should.equal('Testing Team');
      done();
    });
  });

  it('should not allow teams with duplicate names', function (done) {
    team.save(function (err) {
      if (err) {
        err.code.should.equal(11000);
      }
      done();
    });
  });

  it('should allow teams to be deleted', function (done) {
    team.remove(function (err, user) {
      if (err) {
        throw (err);
      }
      done();
    });
  });

});
