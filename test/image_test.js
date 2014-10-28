var expect = require('chai').expect;
var Docker = require('../lib/docker');
var docker = new Docker({host: '127.0.0.1', port: 4243});

var testImage = 'ubuntu:14.04';

describe("System", function() {
  describe("System Info", function() {
    it("should return system info", function(done) {
      this.timeout(5000);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.ok;
        done();
      }

      docker.info(handler);
    });
  });

  describe("Docker Version", function() {
    it("should return version", function(done) {
      this.timeout(5000);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.ok;
        done();
      }

      docker.version(handler);
    });
  });

});

describe("Image", function() {
  describe("List Images", function() {
    it("should list images", function(done) {
      this.timeout(5000);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.a('array');
        done();
      }

      docker.listImages({all: 1}, handler);
    });
  });

  describe('Pull Image', function() {
    this.timeout(50000);

    // one image with one tag
    var repoTag = 'ubuntu:14.04';

    // XXX: Should this be an extra abstraction in docker.js?
    function locateImage(image, callback) {
      docker.listImages(function(err, list) {
        if (err) return callback(err);

        // search for the image in the RepoTags
        var image;
        for (var i = 0, len = list.length; i < len; i++) {
          if (list[i].RepoTags.indexOf(repoTag) !== -1) {
            // ah ha! repo tags
            return callback(null, docker.getImage(list[i].Id));
          }
        }

        return callback();
      });
    }

    it('should pull image from remote source', function(done) {
      function handler() {
        locateImage(repoTag, function(err, image) {
          if (err) return done(err);
          // found the image via list images
          expect(image).to.be.ok;
          done();
        });
      }

      docker.pull(repoTag, function(err, stream) {
        if (err) return done(err);
        // XXX: Do we want the full stream in the test?
        stream.pipe(process.stdout);
        stream.once('end', handler);
      });
    });
  });

  describe("Inspect", function() {
    it("should inspect a image", function(done) {

      var image = docker.getImage(testImage);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.ok;
        done();
      }

      image.inspect(handler);
    });
  });

  describe("History", function() {
    it("should get image history", function(done) {

      var image = docker.getImage(testImage);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.a('array');
        done();
      }

      image.history(handler);
    });
  });


  describe("Get", function() {
    it("should get an image", function(done) {
      this.timeout(120000);

      var image = docker.getImage(testImage);

      function handler(err, stream) {
        expect(err).to.be.null;
        expect(stream).to.be.ok;

        done();
      }

      image.get(handler);
    });
  });
    
});
