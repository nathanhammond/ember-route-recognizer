import { bind } from './polyfills';
import { normalizePath } from './normalizer';

function buildSegmentTrieNode(router, value) {
  switch (value.charCodeAt(0)) {
    case 58: return new DynamicSegment(...arguments); // : => 58
    case 42: return new GlobNode(...arguments); // * => 42
    default: return new StaticSegment(...arguments);
  }
}

function matcher(path, callback) {
  var leaf = this;
  path = path.replace(/^[\/]*/, '');
  path = path.replace(/[\/]*$/, '');

  var segments;
  if (path === '') {
    segments = [];
  } else {
    segments = path.split('/');
  }

  // As we're adding segments we need to track the current leaf.
  for (var i = 0; i < segments.length; i++) {
    segments[i] = buildSegmentTrieNode(this.router, segments[i]);

    leaf = leaf.append(segments[i]);
  }

  if (segments.length === 0) {
    leaf = leaf.append(new EpsilonSegment(this.router));
  }

  if (callback) {
    // No handler, delegate back to the TrieNode's `to` method.
    leaf.to(undefined, callback);
  }

  return leaf;
}


/* Semi-abstract class. */

class SegmentTrieNode {
  constructor(router, value) {
    this.router = router;
    this.parent = undefined;
    this.children = {
      staticSegments: {},
      epsilonSegments: [],
      dynamicSegments: [],
      globNodes: []
    };

    this.name = undefined;
    this.type = undefined;
    this.handler = undefined;
    this.value = value;
  }

  get regex() {
    return '';
  }

  get score() {
    return '0';
  }

  output() {
    return '';
  }

  append(node) {
    return node.appendTo(this);
  }

  appendTo() {
    throw new Error('appendTo may only be called on a subclass of SegmentTrieNode.');
  }

  equivalent(node) {
    return (
      this.type === node.type &&
      this.value === node.value &&
      this.handler === node.handler
    );
  }

  getDuplicate(haystack) {
    for (let i = 0; i < haystack.length; i++) {
      if (this.equivalent(haystack[i])) {
        return haystack[i];
      }
    }
    return false;
  }

  to(handler, callback) {
    this.handler = handler;

    if (callback) {
      if (callback.length === 0) { throw new Error("You must have an argument in the function passed to `to`"); }
      callback(bind(matcher, this));
    }

    return this;
  }

}

/* Concrete implementations. */

var escapeChars = /[\\^$.*+?()[\]{}|]/g;

class StaticSegment extends SegmentTrieNode {
  constructor(router, value) {
    value = normalizePath(value);
    super(router, value);
    this.type = 'static';
  }

  get regex() {
    return this.value.replace(escapeChars, '\\$&');
  }

  get score() {
    return '3';
  }

  output() {
    return '/' + this.value;
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    let haystacks = this.parent.children.staticSegments;

    // Static segment hasn't been seen before.
    // Static segment has been seen before, but this node isn't equivalent to any existing.
    // Static segment has been seen before, this node is equivalent to an existing node.

    if (!haystacks[this.value]) {
      haystacks[this.value] = [ this ];
    } else {
      let existingNode = this.getDuplicate();
      if (existingNode) {
        return existingNode;
      } else {
        haystacks[this.value].push(this);
      }
    }
    return this;
  }

  getDuplicate() {
    let haystack = this.parent.children.staticSegments[this.value];
    return super.getDuplicate(haystack);
  }
}

class EpsilonSegment extends SegmentTrieNode {
  constructor() {
    super(...arguments);
    this.type = 'epsilon';
  }

  get score() {
    return '0';
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    let haystack = this.parent.children.epsilonSegments;

    let existingNode = this.getDuplicate();
    if (existingNode) {
      return existingNode;
    } else {
      haystack.push(this);
    }

    return this;
  }

  getDuplicate() {
    let haystack = this.parent.children.epsilonSegments;
    return super.getDuplicate(haystack);
  }
}

class DynamicSegment extends SegmentTrieNode {
  constructor(router, value) {
    super(router, value.substr(1));
    this.type = 'dynamic';
  }

  get regex() {
    return '([^/]+)';
  }

  get score() {
    return '2';
  }

  output(params) {
    let value = params[this.value];

    if (this.router.ENCODE_AND_DECODE_PATH_SEGMENTS) {
      value = encodeURIComponent(value);
    }

    return '/' + value;
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    let haystack = this.parent.children.dynamicSegments;

    let existingNode = this.getDuplicate();
    if (existingNode) {
      return existingNode;
    } else {
      haystack.push(this);
    }

    return this;
  }

  getDuplicate() {
    let haystack = this.parent.children.dynamicSegments;
    return super.getDuplicate(haystack);
  }
}

class GlobNode extends SegmentTrieNode {
  constructor(router, value) {
    super(router, value.substr(1));
    this.type = 'glob';

    // Glob nodes maintain a circular reference to themselves.
    // This is so they may consume multiple segments.
    this.children.globNodes = [ this ];
  }

  get regex() {
    return '(.+)(?:/?)';
  }

  get score() {
    return '1';
  }

  output(params) {
    return '/' + params[this.value];
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    let haystack = this.parent.children.globNodes;

    let existingNode = this.getDuplicate();
    if (existingNode) {
      return existingNode;
    } else {
      haystack.push(this);
    }

    return this;
  }

  getDuplicate() {
    let haystack = this.parent.children.globNodes;
    return super.getDuplicate(haystack);
  }
}

export default { matcher, SegmentTrieNode, StaticSegment, EpsilonSegment, DynamicSegment, GlobNode };
export { matcher, SegmentTrieNode, StaticSegment, EpsilonSegment, DynamicSegment, GlobNode };
