'use strict';

/**
 * Demo Controller
 */

module.exports.controller = function (app) {
  app.get('/demo', function (req, res) {
    res.render('demo/demo', {
      url: '/dashboard'
    });
  });
};
