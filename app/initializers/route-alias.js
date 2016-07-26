export function initialize() {
  // Make this work in 1.X and 2.X without deprecation warnings.
  var application = arguments[1] || arguments[0];

  // The dictionary we'll be using.
  application._routeAliasLookup = {};
}

export default {
  name: 'route-alias',
  initialize: initialize
};
