import { matcher, EpsilonSegment } from './segment-trie-node';
import RecognizeResults from './recognize-results';
import { bind, isArray } from './polyfills';
import transition from './nfa-transition';

function moreSpecific(a, b) {
  for (var i = 0; i < a.length; i++) {
    if (a.specificity[i] > b.specificity[i]) {
      return a;
    } else if (a.specificity[i] < b.specificity[i]) {
      return b;
    }
  }

  return a;
}

function decodeQueryParamPart(part) {
  // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
  part = part.replace(/\+/gm, '%20');
  let result;
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

  _process(segmentTrieNode, path, queryParams) {
    let handlers = new RecognizeResults(queryParams);
    let specificity = [ 0, 0, '' ]; // [ handlers, segments, segmentType ]
    let segments = [];

    // Calculate specificty, get references in order.
    do {
      specificity[0] += !!segmentTrieNode.handler;
      specificity[1]++;
      specificity[2] = segmentTrieNode.score + specificity[2];
      segments.unshift(segmentTrieNode);
    } while (segmentTrieNode = segmentTrieNode.parent);

    // Get regex to match against.
    let deconstructing = new RegExp(segments
      .filter((segmentTrieNode) => { return !(segmentTrieNode instanceof EpsilonSegment); })
      .map((segmentTrieNode) => { return segmentTrieNode.regex; })
      .join('/')
    );
    let matches = deconstructing.exec(path);

    for (var i = segments.length - 1; i >=0; i--) {
      segmentTrieNode = segments[i];
      if (segmentTrieNode.handler) {
        handlers.unshift({
          isDynamic: false,
          handler: segmentTrieNode.handler,
          params: {}
        });
      }
      if (segmentTrieNode.type === 'dynamic' || segmentTrieNode.type === 'glob') {
        handlers[0].isDynamic = true;
        handlers[0].params[segmentTrieNode.value] = matches.pop();
      }
    }

    specificity[2] = parseInt(specificity[2], 10);
    handlers.specificity = specificity;

    return handlers;
  }

  add() {}

  handlersFor(name) {
    let segmentTrieNode = this.names[name];

    if (!segmentTrieNode) { throw new Error("There is no route named " + name); }

    let handlers = [];

    do {
      if (segmentTrieNode.handler) {
        handlers.push({
          handler: segmentTrieNode.handler,
          names: []
        });
      }
      if (segmentTrieNode.type === 'dynamic' || segmentTrieNode.type === 'glob') {
        handlers[handlers.length - 1].names.unshift(segmentTrieNode.value);
      }
    } while (segmentTrieNode.parent);

    return handlers.reverse();
  }

  hasRoute(name) {
    return !!this.names[name];
  }

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
    let current;
    for (let i = 1; i < nextSet.length; i++) {
      current = this._process(nextSet[i], path);
      solution = moreSpecific(solution, current);
    }

    return solution;
  }

  toJSON() {}
}
