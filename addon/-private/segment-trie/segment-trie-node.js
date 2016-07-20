class SegmentTrieNode {
  constructor(router, value) {
    this.router = router;

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

}

export default SegmentTrieNode;
