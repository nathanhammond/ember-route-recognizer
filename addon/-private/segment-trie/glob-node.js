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
    this.haystack = this.parent.children.globNodes;
    return this.existingOrSelf();
  }

}

export default GlobNode;
