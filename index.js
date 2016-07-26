/* jshint node: true */
'use strict';

var fs = require('fs');
var path = require('path');
var recast = require('recast');
var stew = require('broccoli-stew');
var funnel = require('broccoli-funnel');
var merge = require('broccoli-merge-trees');
var concat = require('broccoli-concat');
var clone = require('clone');

var header = 'import RouteRecognizer from \'ember-route-recognizer/-private/route-recognizer\';\n';
var serialized = 'var serialized = JSON.parse(\'{}\');\n'

// Grab the first object inside of the patch.
var patch;
recast.visit(recast.parse(fs.readFileSync(__dirname + '/lib/patch.js', 'utf8')), {
  visitObjectExpression: function(path) {
    patch = path.value.properties;
    return false;
  }
});

module.exports = {
  name: 'ember-route-recognizer',

  shouldIncludeChildAddon: function(childAddon) {
    if (childAddon.name === 'loader.js') {
      return false;
    } else {
      return this._super.shouldIncludeChildAddon.apply(this, arguments);
    }
  },

  preprocessTree: function(type, tree) {
    if (type !== 'js') { return tree; }

    // Get router.js
    var originalRouterTree = stew.find(tree, '*/router.js');
    originalRouterTree = stew.rename(originalRouterTree, 'router.js', 'router.original.js');
    originalRouterTree = stew.map(originalRouterTree, '*/router.original.js', function(content) {
      content = content.replace(/import routerSetup.*/g, '');
      content = content.replace(/extend\(routerSetup.*\{/g, 'extend({');
      return content;
    });

    var modifiedRouterTree = stew.map(tree, '*/router.js', function(content) {
      // Prepend the import for the new route-recognizer.
      content = header + serialized + content;

      // Parse the AST and walk it to insert the patch.
      var ast = recast.parse(content);

      recast.visit(ast, {
        visitMemberExpression: function(path) {

          // Find `Router.map` and its arguments.
          if (path.value.property.name === 'map' && path.value.object.name === 'Router') {
            path.parentPath.replace();
          }

          // Find `Router.extend` and its arguments.
          if (path.value.property.name === 'extend' && path.value.object.property.name === 'Router') {
            var args = path.parentPath.value.arguments;
            var extendObject = args[args.length - 1];
            extendObject.properties = extendObject.properties.concat(patch);
          }

          this.traverse(path);
        }
      });

      return recast.print(ast).code;
    });

    var result = new merge([originalRouterTree, modifiedRouterTree]);

    return result;
  },

  postprocessTree: function(type, tree) {
    if (type !== 'js') { return tree; }

    var addonTree = require('broccoli-babel-transpiler')(this.treeFor('addon'), getBabelOptions(this));

    var loaderjsPath = require.resolve('loader.js');
    var loaderjsTree = new funnel(path.dirname(loaderjsPath), {
      destDir: '_precompile'
    });

    var emberPath = path.join(this.app.bowerDirectory, 'ember');
    var emberTree = new funnel(emberPath, {
      include: ['ember.prod.js'],
      destDir: '_precompile'
    });

    var config;
    var configPath = path.join(this.app.name, 'config', 'environments', this.app.env + '.json');
    var configTree = this.app._configTree();
    configTree = stew.map(configTree, configPath, function(content) {
      config = JSON.parse(content);
      var module = fs.readFileSync(__dirname + '/lib/config-module.js', 'utf8');
      module = module.replace(/\{\{MODULE_PREFIX\}\}/g, config.modulePrefix);
      module = module.replace(/\{\{CONFIG_JSON\}\}/g, content);
      return module;
    });
    configTree = stew.find(configTree, configPath);
    configTree = stew.mv(configTree, configPath, '_precompile/config.js');

    var routerTree = stew.find(tree, '*/router.original.js');
    routerTree = stew.mv(routerTree, '*/router.original.js', '_precompile/router.js');

    var serialized;
    var precompile = new merge([loaderjsTree, emberTree, configTree, routerTree, addonTree]);
    precompile = concat(precompile, {
      outputFile: 'precompile.js',
      headerFiles: ['_precompile/loader.js'],
      footerFiles: ['_precompile/ember.prod.js', '_precompile/config.js', '_precompile/router.js'],
      inputFiles: ['**/*']
    });
    precompile = stew.map(precompile, 'precompile.js', function(content) {
      // Patch Ember.
      content = content.replace('_initRouterJs: function () {', '_initRouterJs: function (options, recognizer) {');
      content = content.replace('new _router4.default();', 'new _router4.default(options, recognizer);');
      content = content.replace('function Router(_options)', 'function Router(_options, recognizer)');
      content = content.replace(/this.recognizer[^;]*/, 'this.recognizer = new recognizer();');

      var footer = fs.readFileSync(__dirname + '/lib/precompile-footer.js', 'utf8');
      footer = footer.replace('dummy/router.original', config.modulePrefix + '/router.original')
      fs.writeFileSync('precompile.js', content + footer, 'utf8');
      serialized = require(path.join(process.cwd(), '/precompile'));
      fs.unlink('precompile.js')
      return serialized;
    });
    precompile = stew.rename(precompile, 'precompile.js', 'precompile.json');

    var result = new merge([precompile, tree]);
    result = stew.rm(result, '*/router.original.js')
    result = stew.map(result, '*/router.js', function(content) {
      content = content.replace("JSON.parse('{}')", "JSON.parse('"+serialized+"')");
      return content;
    });
    return result;
  }
};

function getBabelOptions(addonContext) {
  var options = clone(getAddonOptions(addonContext));

  // Ensure modules aren't compiled unless explicitly set to compile
  options.blacklist = options.blacklist || ['es6.modules'];

  // do not enable non-standard transforms
  if (!('nonStandard' in options)) {
    options.nonStandard = false;
  }

  // Don't include the `includePolyfill` flag, since Babel doesn't care
  delete options.includePolyfill;

  if (options.compileModules === true) {
    if (options.blacklist.indexOf('es6.modules') >= 0) {
      options.blacklist.splice(options.blacklist.indexOf('es6.modules'), 1);
    }

    delete options.compileModules;
  } else {
    if (options.blacklist.indexOf('es6.modules') < 0) {
      options.blacklist.push('es6.modules');
    }
  }

  // Ember-CLI inserts its own 'use strict' directive
  options.blacklist.push('useStrict');
  options.highlightCode = false;

  return options;
}

function getAddonOptions(addonContext) {
  var baseOptions = (addonContext.parent && addonContext.parent.options) || (addonContext.app && addonContext.app.options);
  return baseOptions && baseOptions.babel || {};
}
