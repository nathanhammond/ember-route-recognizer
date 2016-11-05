/*jshint node:true*/
/* global require, module */
var EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
var Rollup = require('broccoli-rollup');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var FileCreator = require('broccoli-file-creator');
var replace = require('rollup-plugin-replace');
var typescript = require('broccoli-typescript-compiler').typescript;

// We use the dummy application build to output the `dist` we need.
module.exports = function(defaults) {
  var app = new EmberAddon(defaults);

  // Only use the dummy app for non-production builds.
  var originalToTree = app.toTree;
  app.toTree = function() {
    if (this.env !== 'production') {
      return originalToTree.apply(this, arguments);
    }
  };

  // Because this will eventually adopt TypeScript we use `tsc` to do transpilation.
  var typescriptVersion = typescript('addon/-private', {
    annotation: "TypeScript to ES3 + modules.",
    tsconfig: {
      "compilerOptions": {
        "allowJs": true,
        "module": "es6",
        "target": "es3",
        "moduleResolution": "node",
        "newLine": "lf",
        "noEmitHelpers": false,
        "sourceMap": false,
        "outDir": "typescript"
      },
      files: [
        "route-recognizer.js"
      ]
    }
  });

  // TODO: Manually add in the helpers we need:
  // Set `"noEmitHelpers": true` above.
  // var __extends = require('tslib').__extends;
  // __extends.toString();

  var rollupVersion = new Rollup(typescriptVersion, {
    annotation: 'route-recognizer.js',
    rollup: {
      entry: 'typescript/route-recognizer.js',
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

  return new MergeTrees([app.toTree(), rollupVersion, map].filter(Boolean));
};
