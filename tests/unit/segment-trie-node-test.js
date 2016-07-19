import { StaticSegment, EpsilonSegment, DynamicSegment, GlobNode } from 'ember-route-recognizer/-private/segment-trie-node';
import { module, test } from 'qunit';

module('Unit | SegmentTrieNode');

test('SegmentTrieNode#equivalent', function(assert) {
  let one = new StaticSegment('value');
  let two = new StaticSegment('value');

  assert.ok(one.equivalent(two), "Identically constructed nodes are equivalent.");

  two.handler = "something";
  assert.ok(!one.equivalent(two), "Modifying the node makes them non-equivalent.");
});

test('StaticSegment#append', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new StaticSegment({}, 'child');
  let child2 = new StaticSegment({}, 'child');
  let append1 = parent.append(child1);
  let append2 = parent.append(child2);

  let haystack = parent.children.staticSegments['child'];
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('StaticSegment#appendTo', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new StaticSegment({}, 'child');
  let child2 = new StaticSegment({}, 'child');
  let append1 = child1.appendTo(parent);
  let append2 = child2.appendTo(parent);

  let haystack = parent.children.staticSegments['child'];
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('EpsilonSegment#append', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new EpsilonSegment({});
  let child2 = new EpsilonSegment({});
  let append1 = parent.append(child1);
  let append2 = parent.append(child2);

  let haystack = parent.children.epsilonSegments;
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('EpsilonSegment#appendTo', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new EpsilonSegment({});
  let child2 = new EpsilonSegment({});
  let append1 = child1.appendTo(parent);
  let append2 = child2.appendTo(parent);

  let haystack = parent.children.epsilonSegments;
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('DynamicSegment#append', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new DynamicSegment({}, 'child');
  let child2 = new DynamicSegment({}, 'child');
  let append1 = parent.append(child1);
  let append2 = parent.append(child2);

  let haystack = parent.children.dynamicSegments;
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('DynamicSegment#appendTo', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new DynamicSegment({}, 'child');
  let child2 = new DynamicSegment({}, 'child');
  let append1 = child1.appendTo(parent);
  let append2 = child2.appendTo(parent);

  let haystack = parent.children.dynamicSegments;
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('new GlobNode()', function(assert) {
  let globNode = new GlobNode({}, 'globby');
  assert.ok(globNode.children.globNodes[0] === globNode, "Maintains a circular reference to itself.");
});

test('GlobNode#append', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new GlobNode({}, 'child');
  let child2 = new GlobNode({}, 'child');
  let append1 = parent.append(child1);
  let append2 = parent.append(child2);

  let haystack = parent.children.globNodes;
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});

test('GlobNode#appendTo', function(assert) {
  let parent = new StaticSegment({}, 'parent');
  let child1 = new GlobNode({}, 'child');
  let child2 = new GlobNode({}, 'child');
  let append1 = child1.appendTo(parent);
  let append2 = child2.appendTo(parent);

  let haystack = parent.children.globNodes;
  assert.ok(haystack.indexOf(child1) !== -1, "Appends the first child.");
  assert.ok(haystack.indexOf(child2) === -1, "Collapses an equivalent trie node on insertion.");
  assert.ok(append1 === child1, "Return value matches the appended node on addition.");
  assert.ok(append2 === child1, "Return value matches the equivalent node on collapsing.");
});
