
define('ember', ['exports'], function(exports) {
  exports['default'] = Ember;
});

var Router = require('dummy/router.original');
var RouterInstance = Router.default.create();
var RouteRecognizer = require('modules/ember-route-recognizer/-private/route-recognizer').default;
RouterInstance._initRouterJs({}, RouteRecognizer);

module.exports = JSON.stringify(RouterInstance.router.recognizer);
