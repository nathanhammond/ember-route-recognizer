
define('ember', ['exports'], function(exports) {
  exports['default'] = Ember;
});

// Sets up our magic alias function.
function createAlias() {
  Ember.RouterDSL.prototype.alias = function(aliasRoute, aliasPath, aliasTarget) {
    Ember.assert('You must create a route prior to creating an alias.', this.handlers || this.intercepting);
    Ember.assert('The alias target must exist before attempting to alias it.', this.handlers[aliasTarget]);

    // Grab a reference to the arguments passed in for the original route.
    var options = this.handlers[aliasTarget][0];
    var callback = this.handlers[aliasTarget][1];
    options.path = aliasPath;

    this.intercepting.push({ aliasRoute, aliasTarget });

    this.route(aliasRoute, options, callback);
  };
}

// Patches the RouterDSL route function to work with aliases.
function patchRoute(lookup) {
  // Save off the original method in scope of the prototype modifications.
  var originalRouteMethod = Ember.RouterDSL.prototype.route;

  // We need to do a few things before and after the original route function.
  Ember.RouterDSL.prototype.route = function(name, options, callback) {
    Ember.assert('You may not include a "." in your route name.', !~name.indexOf('.'));

    // Method signature identification from the original method.
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    // Save off a reference to the original arguments in a reachable scope.
    // This is so later calls to `alias` have something to find.
    if (!this.handlers) { this.handlers = {}; }
    this.handlers[name] = [ options, callback ];

    // For storing the root of the aliased route.
    if (!this.intercepting) { this.intercepting = []; }

    // So, we're "recursing" through a structure, but we can sneak in by wrapping the invoked function.
    if (this.intercepting.length) {

      // Make the callback modify the DSL generated for nested routes.
      // Necessary so they can register themselves.
      // Propogate the original interception information forward.
      var currentIntercepting = this.intercepting[this.intercepting.length - 1];
      var interceptingCallback = function() {
        this.intercepting = [currentIntercepting];
        callback.call(this);
      };

      // Figure out how many routes we created.
      var originalLength = this.matches.length;
      originalRouteMethod.call(this, name, options, callback ? interceptingCallback : undefined);
      var newLength = this.matches.length;

      // Add each of them to the lookup.
      for (var i = originalLength; i < newLength; i++) {
        var intermediate = this.matches[i][1].split('.');
        var qualifiedAliasRoute = intermediate.join('/');
        var qualifiedTargetRoute = qualifiedAliasRoute.replace(currentIntercepting.aliasRoute, currentIntercepting.aliasTarget);

        if (qualifiedAliasRoute !== qualifiedTargetRoute) {
          lookup[qualifiedAliasRoute] = qualifiedTargetRoute;
        } else {
          // For index routes we need to try again with the base intercepting object.
          var isIndex = intermediate.pop().indexOf('index') === 0;
          qualifiedTargetRoute = qualifiedAliasRoute.replace(this.intercepting[0].aliasRoute, this.intercepting[0].aliasTarget);
          if (isIndex && qualifiedAliasRoute !== qualifiedTargetRoute) {
            lookup[qualifiedAliasRoute] = qualifiedTargetRoute;
          }
        }
      }

    } else {
      originalRouteMethod.call(this, name, options, callback);
    }
  };
}

lookup = {};
createAlias();
patchRoute(lookup);

var Router = require('dummy/router.original');
var RouterInstance = Router.default.create();
var RouteRecognizer = require('modules/ember-route-recognizer/-private/route-recognizer').default;
RouterInstance._initRouterJs({}, RouteRecognizer);

module.exports = {
  routes: JSON.stringify(RouterInstance.router.recognizer),
  lookup: lookup
};
