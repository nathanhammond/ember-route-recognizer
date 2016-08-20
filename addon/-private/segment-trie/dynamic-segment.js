import SegmentTrieNode from './segment-trie-node';
import { encodePathSegment } from '../normalizer';

class DynamicSegment extends SegmentTrieNode {
  constructor() {
    super(...arguments);
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
      value = encodePathSegment(value);
    }

    return '/' + value;
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    this.haystack = this.parent.children.dynamicSegments;
    return this._existingOrSelf();
  }

}

export default DynamicSegment;
