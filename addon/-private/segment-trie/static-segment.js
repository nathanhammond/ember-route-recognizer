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

    // Static segment may not have been seen before.
    let haystacks = this.parent.children.staticSegments;
    if (!haystacks[this.value]) {
      haystacks[this.value] = [];
    }
    this.haystack = haystacks[this.value];

    return this.existingOrSelf();
  }

}

export default StaticSegment;
