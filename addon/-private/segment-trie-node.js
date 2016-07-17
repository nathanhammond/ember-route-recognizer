/* Semi-abstract class. */

class SegmentTrieNode {
  constructor() {
    this.parent = undefined;
    this.children = {
      staticSegments: {},
      epsilonSegments: [],
      dynamicSegments: [],
      globNodes: []
    };

    this.type = undefined;
    this.handler = undefined;
    this.value = undefined;
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
}

/* Concrete implementations. */

class StaticSegment extends SegmentTrieNode {
  constructor(value) {
    super(...arguments);
    this.type = 'static';
    this.value = value;
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
    this.value = undefined;
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
  constructor(value) {
    super(...arguments);
    this.type = 'dynamic';
    this.value = value;
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
  constructor(value) {
    super(...arguments);
    this.type = 'glob';
    this.value = value;

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

export default { SegmentTrieNode, StaticSegment, EpsilonSegment, DynamicSegment, GlobNode };
export { SegmentTrieNode, StaticSegment, EpsilonSegment, DynamicSegment, GlobNode };
