import SegmentTrieNode from './segment-trie-node';

class DynamicSegment extends SegmentTrieNode {
  constructor(router, value) {
    super(router, value.substr(1));
    this.type = 'dynamic';
  }

  get regex() {
    return '([^/]+)';
  }

  get score() {
    return '2';
  }

  output(params) {
    let value = params[this.value];

    if (this.router.ENCODE_AND_DECODE_PATH_SEGMENTS) {
      value = encodeURIComponent(value);
    }

    return '/' + value;
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

export default DynamicSegment;
