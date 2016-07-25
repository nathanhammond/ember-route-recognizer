import SegmentTrieNode from './segment-trie-node';

class EpsilonSegment extends SegmentTrieNode {
  constructor() {
    super(...arguments);
    this.type = 'epsilon';
  }

  get score() {
    return '';
  }

  output() {
    return '';
  }
  appendTo(parentNode) {
    this.parent = parentNode;
    this.haystack = this.parent.children.epsilonSegments;
    return this._existingOrSelf();
  }

}

export default EpsilonSegment;
