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

  to() {

  }
}

export default SegmentTrieNode;
