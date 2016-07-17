/* jshint node: true */
'use strict';

var fs = require('fs');
var recast = require('recast');
var stew = require('broccoli-stew');

var header = 'import RouteRecognizer from \'ember-route-recognizer/-private/route-recognizer\';\n';
var serialized = 'var serialized;\n'

// Grab the first object inside of the patch.
var patch;
recast.visit(recast.parse(fs.readFileSync('lib/patch.js', 'utf8')), {
  visitObjectExpression: function(path) {
    patch = path.value.properties;
    return false;
  }
});

module.exports = {
  name: 'ember-route-recognizer',

  preprocessTree: function(type, tree) {
    if (type !== 'js') { return tree; }

    // Get router.js
    return stew.map(tree, '*/router.js', function(content) {
      // Prepend the import for the new route-recognizer.
      content = header + serialized + content;

      // Parse the AST and walk it to insert the patch.
      var ast = recast.parse(content);

      recast.visit(ast, {
        visitMemberExpression: function(path) {

          // Find `Router.extend` and its arguments.
          if (path.value.property.name === 'extend' && path.value.object.property.name === 'Router') {
            var extendObject = path.parentPath.value.arguments[0];
            extendObject.properties = extendObject.properties.concat(patch);
          }

          this.traverse(path);
        }
      });

      return recast.print(ast).code;
    });
  }
};
