import { matcher, EpsilonSegment } from './segment-trie-node';
import RecognizeResults from './recognize-results';
import { bind, isArray } from './polyfills';
import transition from './nfa-transition';

function decodeQueryParamPart(part) {
  // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
  part = part.replace(/\+/gm, '%20');
  var result;
  try {
    result = decodeURIComponent(part);
  } catch(error) {result = '';}
  return result;
}

export default class RouteRecognizer {
  constructor() {
    this.rootState = new EpsilonSegment(this);
    this.names = {};
  }

  _process(segmentTrieNode, path) {
    let segments = [];

    do {
      segments.unshift(segmentTrieNode);
    } while (segmentTrieNode = segmentTrieNode.parent);

    let regex = new RegExp(segments.map(function(segmentTrieNode) {
      return segmentTrieNode.regex;
    }).join('/'));

    regex.match(path);

    return new RecognizeResults();
  }

  add() {}
  handlersFor() {}
  hasRoute() {}

  generate(name, params) {
    let output = '';
    let segmentTrieNode = this.names[name];

    if (!segmentTrieNode) { throw new Error("There is no route named " + name); }

    let segments = [];
    do {
      segments.unshift(segmentTrieNode);
    } while (segmentTrieNode = segmentTrieNode.parent);

    for (let i = 0; i < segments.length; i++) {
      output += segments[i].output(params);
    }

    if (params && params.queryParams) {
      output += this.generateQueryString(params.queryParams);
    }

    // "/".charCodeAt(0) === 47
    if (output.charCodeAt(0) !== 47) {
      output = '/' + output;
    }

    return output;
  }

  generateQueryString(params) {
    let pairs = [];
    let keys = [];
    for(let key in params) {
      if (params.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    keys.sort();
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let value = params[key];
      if (value == null) {
        continue;
      }
      let pair = encodeURIComponent(key);
      if (isArray(value)) {
        for (let j = 0; j < value.length; j++) {
          let arrayPair = key + '[]' + '=' + encodeURIComponent(value[j]);
          pairs.push(arrayPair);
        }
      } else {
        pair += "=" + encodeURIComponent(value);
        pairs.push(pair);
      }
    }

    if (pairs.length === 0) { return ''; }

    return "?" + pairs.join("&");
  }

  map(callback/*, addRouteCallback*/) {
    callback(bind(matcher, this.rootState));
  }

  parseQueryString(queryString) {
    let pairs = queryString.split("&"), queryParams = {};
    for(let i=0; i < pairs.length; i++) {
      let pair      = pairs[i].split('='),
          key       = decodeQueryParamPart(pair[0]),
          keyLength = key.length,
          isArray = false,
          value;
      if (pair.length === 1) {
        value = 'true';
      } else {
        //Handle arrays
        if (keyLength > 2 && key.slice(keyLength -2) === '[]') {
          isArray = true;
          key = key.slice(0, keyLength - 2);
          if(!queryParams[key]) {
            queryParams[key] = [];
          }
        }
        value = pair[1] ? decodeQueryParamPart(pair[1]) : '';
      }
      if (isArray) {
        queryParams[key].push(value);
      } else {
        queryParams[key] = value;
      }
    }
    return queryParams;
  }

  recognize(path) {
    // Chop off the hash portion of the URL.
    let hashStart = path.indexOf('#');
    if (hashStart !== -1) {
      path = path.substr(0, hashStart);
    }

    // Chop off the querystring portion of the URL.
    let queryString, queryParams;
    let queryStart = path.indexOf('?');
    if (queryStart !== -1) {
      queryString = path.substr(queryStart + 1, path.length);
      path = path.substr(0, queryStart);
      queryParams = this.parseQueryString(queryString);
    }

    // Remove leading and trailing slashes as they're not matched.
    path = path.replace(/^[\/]*/, '');
    path = path.replace(/[\/]*$/, '');

    // Adjacent mid-route segments in a route definition
    // are treated as an empty-string static segment.
    // No special handling required.

    // Get the list of segments.
    let segments;
    if (path === '') {
      segments = [];
    } else {
      segments = path.split('/');
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
    let segment;
    do {
      segment = segments.shift();
      nextSet = transition(nextSet, segment);
    } while (nextSet.length && segment !== undefined);

    // Short-circuit exit.
    if (nextSet.length === 0) {
      return null;
    }

    // Unroll this loop to prevent a branch.
    let solution = this._process(nextSet[0], path);
    let temporary;
    for (let i = 1; i < nextSet.length; i++) {
      temporary = this._process(nextSet[i], path);

      if (solution.specificity < temporary.specificity) {
        solution = temporary;
      }
    }

    return solution;
  }

  toJSON() {}
}
