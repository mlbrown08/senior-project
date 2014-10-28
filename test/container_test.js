var expect = require('chai').expect;
var MemoryStream = require('memorystream');
var Docker = require('../lib/docker');
var docker = new Docker({host: '127.0.0.1', port: 4243});

describe("Container Test", function() {

  var testContainer;
  before(function(done){
    docker.createContainer({
      Image: 'ubuntu:14.04',
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
      OpenStdin: false,
      StdinOnce: false
    }, function(err, container) {
      if (err) done(err);
      testContainer = container.id;
      done();
    });
  });

  describe("Inspect", function() {
    it("should inspect a container", function(done) {
      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.ok;
        done();
      }

      container.inspect(handler);
    });
  });

  describe("Start", function() {
    it("should start a container", function(done) {
      this.timeout(60000);

      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        done();
      }

      container.start(handler);
    });
  });
  
  /*
  describe("Resize", function() {
    it("should resize tty a container", function(done) {
      var container = docker.getContainer(testContainer);

      function handle(err, data) {
        expect(err).to.be.null;
        done();
      }

      container.start(function(err, data) {
        var opts = {h: process.stdout.rows, w: process.stdout.columns};
        container.resize(opts, handle);
      });
    });
  });
  */

  describe("Attach", function() {
    var optsc = {
      'Hostname': '',
      'User': '',
      'AttachStdin': false,
      'AttachStdout': true,
      'AttachStderr': true,
      'Tty': false,
      'OpenStdin': false,
      'StdinOnce': false,
      'Env': null,
      'Cmd': ['/bin/bash', '-c', 'uptime'],
      'Dns': ['8.8.8.8', '8.8.4.4'],
      'Image': 'ubuntu:14.04',
      'Volumes': {},
      'VolumesFrom': ''
    };


    it("should attach and wait for a container", function(done) {
      this.timeout(120000);

      function handler(err, container) {
        expect(err).to.be.null;
        expect(container).to.be.ok;

        container.attach({stream: true, stdout: true, stderr: true}, function handler(err, stream) {
          expect(err).to.be.null;
          expect(stream).to.be.ok;

          var memStream = new MemoryStream();
          var output    = '';
          memStream.on('data', function(data) {
            output += data.toString();
          });

          container.modem.demuxStream(stream, memStream, memStream);

          container.start(function(err, data) {
            expect(err).to.be.null;

            container.wait(function(err, data) {
              expect(err).to.be.null;
              expect(data).to.be.ok;
              expect(output).to.match(/.*users.*load average.*/);
              done();
            });
          });
        });

      }

      optsc.AttachStdin = false;
      optsc.OpenStdin = false;
      optsc.Cmd = ['bash', '-c', 'uptime'];

      docker.createContainer(optsc, handler);
    });

    it("should support attach with stdin enable", function(done) {
      this.timeout(120000);

      function handler(err, container) {
        expect(err).to.be.null;
        expect(container).to.be.ok;

        var attach_opts = {stream: true, stdin: true, stdout: true, stderr: true};
        container.attach(attach_opts, function handler(err, stream) {
          expect(err).to.be.null;
          expect(stream).to.be.ok;

          var memStream = new MemoryStream();
          var output    = '';
          memStream.on('data', function(data) {
            output += data.toString();
          });

          stream.pipe(memStream);

          container.start(function(err, data) {
            expect(err).to.be.null;

            stream.write("uptime; exit\n");

            container.wait(function(err, data) {
              expect(err).to.be.null;
              expect(data).to.be.ok;
              expect(output).to.match(/.*users.*load average.*/);
              done();
            });
          });
        });
      }

      optsc.AttachStdin = true;
      optsc.OpenStdin = true;
      optsc.Cmd = ['bash'];

      docker.createContainer(optsc, handler);
    })
  });

  describe("Restart", function() {
    it("should restart a container", function(done) {
      this.timeout(30000);
      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        done();
      }

      container.restart(handler);
    });
  });

  describe("Export", function() {
    it("should export a container", function(done) {
      this.timeout(30000);
      var container = docker.getContainer(testContainer);

      function handler(err, stream) {
        expect(err).to.be.null;
        expect(stream).to.be.ok;
        done();
      }

      container.export(handler);
    });
  });

  describe("Top", function() {
    it("should return top", function(done) {
      this.timeout(10000);
      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.ok;
        done();
      }

      container.top(handler);
    });
  });

  describe("Changes", function() {
    this.timeout(10000);

    var container;
    beforeEach(function(done) {
      docker.run(
        'ubuntu:14.04',
        ['/bin/bash', '-c', 'echo "xfoo" > foo.txt'],
        null,
        function (err, result, subject) {
          // subject is the resulting container from the operation
          container = subject;
          done(err);
        }
      );
    });

    afterEach(function(done) {
      container.remove(done);
    });

    it("should container changes", function(done) {
      function handler(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.ok;
        done();
      }

      container.changes(handler);
    });
  });

  describe("Logs", function() {

    it("should get the logs for a container as a stream", function(done) {
      this.timeout(30000);
      var container = docker.getContainer(testContainer);
      var logs_opts = { follow: true, stdout: true, stderr: true, timestamps: true };

      function handler(err, stream) {
        expect(err).to.be.null;
        expect(stream.pipe).to.be.ok;
        done();
      }

      container.logs(logs_opts, handler);

    });
  });

  describe("Stop", function() {
    it("should stop a container", function(done) {
      this.timeout(30000);
      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        done();
      }

      container.stop(handler);
    });
  });
});

describe("Non-responsive Container", function() {

  var testContainer;
  before(function(done){
    docker.createContainer({
      Image: 'ubuntu:14.04',
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ['/bin/sh', '-c', "trap 'echo no' TERM; while true; do sleep 1; done"],
      OpenStdin: false,
      StdinOnce: false
    }, function(err, container) {
      if (err) done(err);
      testContainer = container.id;
      done();
    });
  });

  describe("Stop", function() {
    it("forced after timeout", function(done) {
      this.timeout(30000);
      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        done();
      }

      container.stop({t: 1000}, handler);
    });
  });

  describe("Restart", function() {
    it("forced after timeout", function(done) {
      this.timeout(30000);
      var container = docker.getContainer(testContainer);

      function handler(err, data) {
        expect(err).to.be.null;
        done();
      }

      container.restart({t: 1000}, handler);
    });
  });

});
