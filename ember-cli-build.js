/*jshint node:true*/
/* global require, module */
var EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
var Rollup = require('broccoli-rollup');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var FileCreator = require('broccoli-file-creator');
var replace = require('rollup-plugin-replace');

module.exports = function(defaults) {
  var app = new EmberAddon(defaults, {
    // Add options here
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  var library = new Rollup('addon/-private', {
    annotation: 'route-recognizer.js',
    rollup: {
      entry: 'route-recognizer.js',
      plugins: [replace({
        VERSION_STRING_PLACEHOLDER: require('./package.json').version
      })],
      targets: [{
        dest: 'es6/route-recognizer.js',
        format: 'es'
      }, {
        dest: 'named-amd/route-recognizer.js',
        format: 'amd',
        moduleId: 'route-recognizer',
        exports: 'named'
      }, {
        dest: 'route-recognizer.js',
        format: 'umd',
        moduleId: 'route-recognizer',
        moduleName: 'RouteRecognizer'
      }]
    }
  });

  var map = new FileCreator('route-recognizer.js.map', '', {
    annotation: 'dummy source map'
  });

  return new MergeTrees([app.toTree(), library, map]);
};
