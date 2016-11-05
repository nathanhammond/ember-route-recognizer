import SegmentTrieNode from './segment-trie-node';
import getParam from '../get-param';

class GlobNode extends SegmentTrieNode {
  constructor() {
    super(...arguments);
    this.type = 'glob';

    // Glob nodes maintain a circular reference to themselves.
    // This is so they may consume multiple segments.
    this.children.globNodes = [ this ];
  }

  get regex() {
    return '(.+)';
  }

  get score() {
    return '1';
  }

  output(params) {
    let value = getParam(params, this.value);

    return '/' + value;
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    this.haystack = this.parent.children.globNodes;
    return this._existingOrSelf();
  }

}

export default GlobNode;
