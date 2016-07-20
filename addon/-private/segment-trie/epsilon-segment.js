import SegmentTrieNode from './segment-trie-node';

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

export default EpsilonSegment;
