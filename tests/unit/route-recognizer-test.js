import RouteRecognizer from 'ember-route-recognizer/-private/route-recognizer';
import { module, test } from 'qunit';

module('Unit | RouteRecognizer');

test('RouteRecognizer#recognize', function(assert) {
  var recognizer = new RouteRecognizer();
  recognizer.recognize('/');
  assert.ok(true);
});
