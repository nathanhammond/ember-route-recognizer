import RouteRecognizer from 'ember-route-recognizer/-private/route-recognizer';
import { module, test } from 'qunit';

module('Unit | RouteRecognizer');

test('RouteRecognizer#recognize', function(assert) {
  assert.ok(true);
});

test('RouteRecognizer#map', function(assert) {
  var recognizer = new RouteRecognizer();
  recognizer.map(function(match) {
    match('/helloworld').to('helloworld');
  });
  assert.ok(recognizer.recognize('/helloworld'), 'Achieved Hello World!');
});
