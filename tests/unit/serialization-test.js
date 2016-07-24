import RouteRecognizer from 'ember-route-recognizer/-private/route-recognizer';
import { module, test } from 'qunit';

module('Unit | Serialization');

test('Hello world.', function(assert) {
  var router = new RouteRecognizer();
  router.map(function(match) {
    match('/helloworld').to('helloworld');
  });
  router.names['helloworld'] = router.nodes[1];
  assert.equal(JSON.stringify(router), '{"names":{"helloworld":1},"nodes":[{"id":0,"type":"epsilon"},{"id":1,"type":"static","value":"helloworld","handler":"helloworld","parent":0}]}');
});
