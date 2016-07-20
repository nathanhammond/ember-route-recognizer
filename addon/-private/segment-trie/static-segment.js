import SegmentTrieNode from './segment-trie-node';
import { normalizePath } from '../normalizer';

var escapeChars = /[\\^$.*+?()[\]{}|]/g;

class StaticSegment extends SegmentTrieNode {
  constructor(router, value) {
    value = normalizePath(value);
    super(router, value);
    this.type = 'static';
  }

  get regex() {
    return this.value.replace(escapeChars, '\\$&');
  }

  get score() {
    return '3';
  }

  output() {
    return '/' + this.value;
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

export default StaticSegment;
