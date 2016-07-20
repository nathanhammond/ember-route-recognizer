import SegmentTrieNode from './segment-trie-node';

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

export default GlobNode;
