import { bind } from './polyfills';

function buildSegmentTrieNode(router, value) {
  switch (value.charCodeAt(0)) {
    case 58: return new DynamicSegment(...arguments); // : => 58
    case 42: return new GlobNode(...arguments); // * => 42
    default: return new StaticSegment(...arguments);
  }
}

function matcher(path, callback) {
  var leaf = this;
  var segments = path.replace(/^\//, '').split('/');

  // As we're adding segments we need to track the current leaf.
  for (var i = 0; i < segments.length; i++) {
    segments[i] = buildSegmentTrieNode(this.router, segments[i]);

    leaf.append(segments[i]);
    leaf = segments[i];
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

    this.type = undefined;
    this.handler = undefined;
    this.value = value;
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

class StaticSegment extends SegmentTrieNode {
  constructor() {
    super(...arguments);
    this.type = 'static';
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
