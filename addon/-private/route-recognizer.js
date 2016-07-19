import { matcher, StaticSegment, EpsilonSegment, DynamicSegment, GlobNode } from './segment-trie-node';
// import RecognizeResults from './recognize-results';
import { bind } from './polyfills';
import transition from './nfa-transition';

export default class RouteRecognizer {
  constructor() {
    this.rootState = new EpsilonSegment(this);
  }

  add() {
    new StaticSegment();
    new EpsilonSegment();
    new DynamicSegment();
    new GlobNode();
  }
  handlersFor() {}
  hasRoute() {}
  generate() {}
  generateQueryString() {}

  map(callback/*, addRouteCallback*/) {
    callback(bind(matcher, this.rootState));
  }

  parseQueryString() {}

  recognize(path) {
    // Chop off the hash portion of the URL.
    var hashStart = path.indexOf('#');
    if (hashStart !== -1) {
      path = path.substr(0, hashStart);
    }

    // Chop off the querystring portion of the URL.
    var queryString, queryParams;
    var queryStart = path.indexOf('?');
    if (queryStart !== -1) {
      queryString = path.substr(queryStart + 1, path.length);
      path = path.substr(0, queryStart);
      queryParams = this.parseQueryString(queryString);
    }

    // Get the list of segments.
    // Remove leading and trailing slashes as they're not important.
    // FIXME: How should this handle adjacent slashes?
    var segments = path.split('/');

    // FIXME: How should this handle leading slashes?
    if (segments[0] === '') {
      segments.shift();
    }

    // FIXME: How should this handle trailing slashes?
    if (segments[segments.length - 1] === '') {
      segments.pop();
    }

    // We're walking a modified radix trie with an NFA-style transition function.
    // The initial solution set is the NFA's initial state/radix trie's root.
    // This will always be a non-consuming EpsilonSegment.
    let nextSet = [ this.rootState ];

    // It's possible that `segments.length === 0` on first run.
    // In that case the segment is `undefined`.
    // The transition function understands what to do with this.
    // Consume the path until we either know that there will be
    // no matches or until we exhaust the segments.
    var segment;
    do {
      segment = segments.shift();
      nextSet = transition(nextSet, segment);
    } while (nextSet.length && segment !== undefined);

    // FIXME: UnrecognizedURLError.
    if (nextSet.length === 0) {
      throw new Error("UnrecognizedURLError");
    }

    let solution = nextSet.sort(function(a,b) {
      return a.specificity - b.specificity;
    })[0];

    return solution;
  }

  toJSON() {}
}
