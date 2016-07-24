import { isArray } from '../polyfills';


function serialize(element) {
  var result = {};
  var keys = Object.keys(element);

  var recursiveKeys;
  for (var i = 0; i < keys.length; i++) {
    if (typeof element[keys[i]] === 'object' && !isArray(element[keys[i]])) {
      // Handle hash of arrays of children.
      if (Object.keys(element[keys[i]]).length) {
        result[keys[i]] = serialize(element[keys[i]]);
      }
    } else {
      // Handle arrays of children.
      for (var j = 0; j < element[keys[i]].length; j++) {
        if (!result[keys[i]]) {
          result[keys[i]] = new Array(element[keys[i]].length);
        }
        result[keys[i]][j] = element[keys[i]][j].id;
      }
    }
  }

  return result;
}

class SegmentTrieNode {
  constructor(router, value) {
    this.router = router;
    this.id = this.router.nodes.push(this);

    this.parent = undefined;
    this.haystack = undefined;
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

  _equivalent(node) {
    return (
      this.type === node.type &&
      this.value === node.value &&
      this.handler === node.handler
    );
  }

  _checkExisting() {
    for (let i = 0; i < this.haystack.length; i++) {
      if (this._equivalent(this.haystack[i])) {
        return this.haystack[i];
      }
    }
    return false;
  }

  _existingOrSelf() {
    let existingNode = this._checkExisting();
    if (existingNode) {
      // This node is equivalent to an existing node.
      return existingNode;
    } else {
      // This node isn't equivalent to any existing node.
      this.haystack.push(this);
    }

    return this;
  }

  toJSON() {
    // Set up baseline own properties.
    var result = {
      id: this.id,
      type: this.type
    };

    // Only include fields when necessary for size reasons.
    if (this.value) {
      result.value = this.value;
    }

    if (this.handler) {
      result.handler = this.handler;
    }

    // Set up parent reference.
    if (this.parent) {
      result.parent = this.parent.id;
    }

    var children = serialize(this.children);
    if (Object.keys(children).length) {
      result.children = children;
    }

    return result;
  }

}

export default SegmentTrieNode;
