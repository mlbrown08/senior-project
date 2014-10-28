'use strict';
/*global describe*/
/*global before*/
/*global it*/

/**
 * Module Dependencies
 */

var should  = require('chai').should();
var Project    = require('../models/Project');
var project;

var mongoose = require('mongoose');
var config = require('../config/config');
mongoose.connect(config.mongodb.url);


/**
 * Test Project Model
 */

describe('Project attributes', function () {

  before(function (done) {
    project = new Project({
      name: 'testing',
    });
    done();
  });

  it('name should be a string', function () {
    project.name.should.be.a('string');
  });

  it('should save a project', function (done) {
    project.save(function (err) {
      if (err) {
        throw (err);
      }
      done();
    });
  });

  it('should find our newly created project', function (done) {
    Project.findOne({ name: project.name }, function (err, user) {
      should.exist(project);
      project.name.should.equal('testing');
      done();
    });
  });

  it('should not allow projects with duplicate names', function (done) {
    project.save(function (err) {
      if (err) {
        err.code.should.equal(11000);
      }
      done();
    });
  });

  it('should allow projects to be deleted', function (done) {
    project.remove(function (err, user) {
      if (err) {
        throw (err);
      }
      done();
    });
  });

});
