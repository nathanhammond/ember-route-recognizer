import SegmentTrieNode from './segment-trie/segment-trie-node';
import DynamicSegment from './segment-trie/dynamic-segment';
import EpsilonSegment from './segment-trie/epsilon-segment';
import GlobNode from './segment-trie/glob-node';
import StaticSegment from './segment-trie/static-segment';

import { bind } from './polyfills';

function buildSegmentTrieNode(router, value) {
  if (value === undefined) {
    return new EpsilonSegment(...arguments);
  }
  switch (value.charCodeAt(0)) {
    case 58: return new DynamicSegment(router, value.substr(1)); // : => 58
    case 42: return new GlobNode(router, value.substr(1)); // * => 42
    default: return new StaticSegment(router, value);
  }
}

function matcher(source) {
  return function matcher(path, callback) {
    var leaf = this;
    path = path.replace(/^[\/]*/, '');
    path = path.replace(/[\/]*$/, '');

    var segments;
    if (path === '') {
      // Gets an epsilon segment.
      segments = [ undefined ];
    } else {
      segments = path.split('/');
    }

    // As we're adding segments we need to track the current leaf.
    for (var i = 0; i < segments.length; i++) {
      segments[i] = buildSegmentTrieNode(this.router, segments[i]);

      leaf = leaf.append(segments[i]);
    }

    if (callback) {
      // No handler, delegate back to the TrieNode's `to` method.
      leaf.to(undefined, callback, source);
    }

    return leaf;
  };
}

// So, this is sad, but we don't get circular references that do the right thing.
SegmentTrieNode.prototype.to = function to(handler, callback, source) {
  var segmentTrieNode = this;
  var router = this.router;

  /**
    Since we allow both collapsing on insert *and* late-binding changes
    it's possible that we did so too eagerly. Fix that just in time when
    we recognize it occurring.
   */
  if (segmentTrieNode.collapsed && segmentTrieNode.handler !== handler) {
    var value = segmentTrieNode.value;
    if (segmentTrieNode.type === 'glob') { value = '*' + value; }
    if (segmentTrieNode.type === 'dynamic') { value = ':' + value; }
    var cloneNode = buildSegmentTrieNode(router, value);
    cloneNode.parent = segmentTrieNode.parent;
    segmentTrieNode.haystack.push(cloneNode);

    segmentTrieNode = cloneNode;
  }

  segmentTrieNode.handler = handler;

  /**
    It's also possible that we're now making something which was previously
    a different node now match. In that case we need to remove the current
    node and collapse it to the previous.
   */
  if (segmentTrieNode.haystack) {
    for (var i = 0; i < segmentTrieNode.haystack.length; i++) {
      if (segmentTrieNode === segmentTrieNode.haystack[i]) {
        continue;
      }
      if (segmentTrieNode._equivalent(segmentTrieNode.haystack[i])) {
        router.nodes.pop();
        // router.nodes[segmentTrieNode.id] = null;
        segmentTrieNode = segmentTrieNode.haystack[i];
        break;
      }
    }
  }

  if (handler && router.addRouteCallback && source !== 'add') {
    var routes = [];
    var traverseNode = segmentTrieNode;
    var prefix = '';

    do {
      // We've found a new handler, start building it up again.
      if (traverseNode.handler) {
        routes.unshift({
          path: '',
          handler: traverseNode.handler
        });
      }

      switch (traverseNode.type) {
        case 'dynamic': prefix = '/:'; break;
        case 'glob': prefix = '/*'; break;
        case 'epsilon': prefix = ''; break;
        default:
        case 'static':
          prefix = '/';
        break;
      }
      if (traverseNode.type === 'epsilon' && routes[0].path === '') {
        routes[0].path = '/';
      }
      if (traverseNode.type !== 'epsilon') {
        routes[0].path = prefix + traverseNode.value + routes[0].path;
      }
    } while (traverseNode = traverseNode.parent);

    router.addRouteCallback(router, routes);
  }

  if (callback) {
    if (callback.length === 0) { throw new Error("You must have an argument in the function passed to `to`"); }
    callback(bind(matcher(source), segmentTrieNode));
  }

  return segmentTrieNode;
};

export { matcher };
