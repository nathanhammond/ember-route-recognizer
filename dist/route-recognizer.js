(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('route-recognizer', factory) :
  (global.RouteRecognizer = factory());
}(this, (function () { 'use strict';

class SegmentTrieNode {
  constructor(router, value, handler) {
    this.router = router;
    this.id = this.router.nodes.push(this) - 1;

    this.parent = undefined;
    this.haystack = undefined;
    this.children = {
      staticSegments: {},
      epsilonSegments: [],
      dynamicSegments: [],
      globNodes: []
    };

    this.name = undefined;
    this.type = undefined;
    this.handler = handler;
    this.value = value;
  }

  get regex() {
    return '';
  }

  get score() {
    return '0';
  }

  output() {
    return '';
  }

  append(node) {
    return node.appendTo(this);
  }

  appendTo() {
    throw new Error('appendTo may only be called on a subclass of SegmentTrieNode.');
  }

  _equivalent(node) {
    return (
      this.type === node.type &&
      this.value === node.value &&
      this.handler === node.handler
    );
  }

  _checkExisting() {
    for (let i = 0; i < this.haystack.length; i++) {
      if (this._equivalent(this.haystack[i])) {
        this.haystack[i].collapsed = true;
        return this.haystack[i];
      }
    }
    return false;
  }

  _existingOrSelf() {
    let existingNode = this._checkExisting();
    if (existingNode) {
      // This node is equivalent to an existing node.
      return existingNode;
    } else {
      // This node isn't equivalent to any existing node.
      this.haystack.push(this);
    }

    return this;
  }

  toJSON() {
    // Set up baseline own properties.
    var result = {
      id: this.id,
      type: this.type
    };

    // Only include fields when necessary for size reasons.
    if (this.value) {
      result.value = this.value;
    }

    if (this.handler) {
      result.handler = this.handler;
    }

    // Set up parent reference.
    if (this.parent) {
      result.parent = this.parent.id;
    }

    return result;
  }

}

// Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
// values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
// chars are "/" and "%".
// Safe to call multiple times on the same path.
function normalizePath(path) {
  return path.split('/')
             .map(normalizeSegment)
             .join('/');
}

// We want to ensure the characters "%" and "/" remain in percent-encoded
// form when normalizing paths, so replace them with their encoded form after
// decoding the rest of the path
var SEGMENT_RESERVED_CHARS = /%|\//g;
function normalizeSegment(segment) {
  return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
}

// We do not want to encode these characters when generating dynamic path segments
// See https://tools.ietf.org/html/rfc3986#section-3.3
// sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
// others allowed by RFC 3986: ":", "@"
//
// First encode the entire path segment, then decode any of the encoded special chars.
//
// The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
// so the possible encoded chars are:
// ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].
var PATH_SEGMENT_ENCODINGS = /%(?:24|26|2B|2C|3B|3D|3A|40)/g;

function encodePathSegment(str) {
  return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
}

var Normalizer = { normalizeSegment, normalizePath, encodePathSegment };

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
    return '/' + params[this.value];
  }

  appendTo(parentNode) {
    this.parent = parentNode;
    this.haystack = this.parent.children.globNodes;
    return this._existingOrSelf();
  }

}

var escapeChars = /[\\^$.*+?()[\]{}|]/g;

class StaticSegment extends SegmentTrieNode {
  constructor(router, value, handler) {
    value = normalizePath(value);
    super(router, value, handler);
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

    return this._existingOrSelf();
  }

}

// This function adds all of the eligible epsilon segments to the current set.
function descendantEpsilonSegments(set) {
  // This is effectively recursive because `set` gets mutated.
  for (var i = 0; i < set.length; i++) {
    set = set.concat(set[i].children.epsilonSegments);
  }

  return set;
}

// This function is invoked upon consumption of the last segment.
function undefinedSegment(set) {
  return set.filter(function(node) {
    return node.handler;
  });
}

// This is the process of moving from node to node inside of the segment trie.
function NFATransition(set, segment) {
  var nextSet = [];

  // First step: If we have epsilon segments we need to add them to the current set.
  set = descendantEpsilonSegments(set);

  if (segment !== undefined) {
    // Iterating over the current set, the next set is always comprised of:

    for (var i = 0; i < set.length; i++) {

      // 1. All static segments matching this segment value.
      if (set[i].children.staticSegments[segment]) {
        nextSet = nextSet.concat(set[i].children.staticSegments[segment]);
      }

      // 2. All dynamic segments.
      nextSet = nextSet.concat(set[i].children.dynamicSegments);

      // 3. All glob segments.
      nextSet = nextSet.concat(set[i].children.globNodes);
    }

  } else {
    // Alternatively we're done before we even start.
    // Handle this last segment by filtering for accepting states.
    nextSet = undefinedSegment(set);
  }

  return nextSet;
}

var oCreate = Object.create || function(proto) {
  function F() {}
  F.prototype = proto;
  return new F();
};

function bind(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  };
}

function isArray(test) {
  return Object.prototype.toString.call(test) === "[object Array]";
}

function buildSegmentTrieNode(router, value) {
  if (value === undefined) {
    return new EpsilonSegment(...arguments);
  }
  switch (value.charCodeAt(0)) {
    case 58: return new DynamicSegment(router, value.substr(1)); // : => 58
    case 42: return new GlobNode(router, value.substr(1)); // * => 42
    default: return new StaticSegment(router, value);
  }
}

function matcher(source) {
  return function matcher(path, callback) {
    var leaf = this;
    path = path.replace(/^[\/]*/, '');
    path = path.replace(/[\/]*$/, '');

    var segments;
    if (path === '') {
      // Gets an epsilon segment.
      segments = [ undefined ];
    } else {
      segments = path.split('/');
    }

    // As we're adding segments we need to track the current leaf.
    for (var i = 0; i < segments.length; i++) {
      segments[i] = buildSegmentTrieNode(this.router, segments[i]);

      leaf = leaf.append(segments[i]);
    }

    if (callback) {
      // No handler, delegate back to the TrieNode's `to` method.
      leaf.to(undefined, callback, source);
    }

    return leaf;
  };
}

// So, this is sad, but we don't get circular references that do the right thing.
SegmentTrieNode.prototype.to = function to(handler, callback, source) {
  var segmentTrieNode = this;
  var router = this.router;

  /**
    Since we allow both collapsing on insert *and* late-binding changes
    it's possible that we did so too eagerly. Fix that just in time when
    we recognize it occurring.
   */
  if (segmentTrieNode.collapsed && segmentTrieNode.handler !== handler) {
    var value = segmentTrieNode.value;
    if (segmentTrieNode.type === 'glob') { value = '*' + value; }
    if (segmentTrieNode.type === 'dynamic') { value = ':' + value; }
    var cloneNode = buildSegmentTrieNode(router, value);
    cloneNode.parent = segmentTrieNode.parent;
    segmentTrieNode.haystack.push(cloneNode);

    segmentTrieNode = cloneNode;
  }

  segmentTrieNode.handler = handler;

  /**
    It's also possible that we're now making something which was previously
    a different node now match. In that case we need to remove the current
    node and collapse it to the previous.
   */
  if (segmentTrieNode.haystack) {
    for (var i = 0; i < segmentTrieNode.haystack.length; i++) {
      if (segmentTrieNode === segmentTrieNode.haystack[i]) {
        continue;
      }
      if (segmentTrieNode._equivalent(segmentTrieNode.haystack[i])) {
        router.nodes.pop();
        // router.nodes[segmentTrieNode.id] = null;
        segmentTrieNode = segmentTrieNode.haystack[i];
        break;
      }
    }
  }

  if (handler && router.addRouteCallback && source !== 'add') {
    var routes = [];
    var traverseNode = segmentTrieNode;
    var prefix = '';

    do {
      // We've found a new handler, start building it up again.
      if (traverseNode.handler) {
        routes.unshift({
          path: '',
          handler: traverseNode.handler
        });
      }

      switch (traverseNode.type) {
        case 'dynamic': prefix = '/:'; break;
        case 'glob': prefix = '/*'; break;
        case 'epsilon': prefix = ''; break;
        default:
        case 'static':
          prefix = '/';
        break;
      }
      if (traverseNode.type === 'epsilon' && routes[0].path === '') {
        routes[0].path = '/';
      }
      if (traverseNode.type !== 'epsilon') {
        routes[0].path = prefix + traverseNode.value + routes[0].path;
      }
    } while (traverseNode = traverseNode.parent);

    router.addRouteCallback(router, routes);
  }

  if (callback) {
    if (callback.length === 0) { throw new Error("You must have an argument in the function passed to `to`"); }
    callback(bind(matcher(source), segmentTrieNode));
  }

  return segmentTrieNode;
};

// This object is the accumulator for handlers when recognizing a route.
// It's nothing more than an array with a bonus property.
function RecognizeResults(queryParams) {
  this.queryParams = queryParams || {};
}
RecognizeResults.prototype = oCreate({
  splice: Array.prototype.splice,
  slice:  Array.prototype.slice,
  push:   Array.prototype.push,
  pop:    Array.prototype.pop,
  unshift:    Array.prototype.unshift,
  length: 0,
  specificity: null,
  queryParams: null
});

function moreSpecific(a, b) {
  for (let i = 0; i < a.specificity.length; i++) {
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

class RouteRecognizer {
  constructor(serialized) {
    this.names = {};
    this.nodes = [];
    this.ENCODE_AND_DECODE_PATH_SEGMENTS = RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS;
    this.rootState = new EpsilonSegment(this);

    if (serialized) {
      this.nodes = new Array(serialized.nodes.length);
      this.nodes[0] = this.rootState;

      var constructorLookup = {
        "dynamic": DynamicSegment,
        "epsilon": EpsilonSegment,
        "glob": GlobNode,
        "static": StaticSegment
      };

      // Skip `rootState`.
      for (var i = 1; i < serialized.nodes.length; i++) {
        if (!serialized.nodes[i]) { continue; }

        this.nodes[i] = new constructorLookup[serialized.nodes[i].type](this, serialized.nodes[i].value, serialized.nodes[i].handler);

        // Parent is guaranteed to exist before the child.
        this.nodes[i].appendTo(this.nodes[serialized.nodes[i].parent]);
      }

      // Map over to get the reference from the ID.
      for (var x in serialized.names) {
        if (!serialized.names.hasOwnProperty(x)) { return; }
        this.names[x] = this.nodes[serialized.names[x]];
      }
    }
  }

  _process(segmentTrieNode, path, trailing, queryParams) {
    let handlers = new RecognizeResults(queryParams);
    let specificity = [ '0', 0, 0 ]; // [ segmentType, segments, handlers ]
    let segments = [];

    // Calculate specificity, get references in order.
    do {
      specificity[0] = segmentTrieNode.score + specificity[0];
      specificity[1]++;
      specificity[2] += !!segmentTrieNode.handler;
      segments.unshift(segmentTrieNode);
    } while (segmentTrieNode = segmentTrieNode.parent);

    // Get regex to match against.
    let deconstructing = new RegExp(
      '^' +
      segments
        .filter((segmentTrieNode) => { return !(segmentTrieNode instanceof EpsilonSegment); })
        .map((segmentTrieNode) => { return segmentTrieNode.regex; })
        .join('/') +
        (segments[segments.length - 1].type === 'glob' ? '' : '(?:/?)') +
      '$'
    );
    let matches = deconstructing.exec(path);

    for (let i = segments.length - 1; i >=0; i--) {
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

        if (segmentTrieNode.router.ENCODE_AND_DECODE_PATH_SEGMENTS && segmentTrieNode.type === 'dynamic') {
          handlers[0].params[segmentTrieNode.value] = decodeURIComponent(handlers[0].params[segmentTrieNode.value]);
        }
      }

    }

    specificity[0] = parseInt(specificity[0], 10);
    handlers.specificity = specificity;

    return handlers;
  }

  add(routes, options) {
    options = options || {};
    let leaf = this.rootState;

    // Go through each passed in route and call the matcher with it.
    for (let i = 0; i < routes.length; i++) {
      leaf = matcher('add').call(leaf, routes[i].path);
      leaf = leaf.to(routes[i].handler, undefined, 'add');
    }
    leaf.name = options.as;
    this.names[options.as] = leaf;
  }

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
    } while (segmentTrieNode = segmentTrieNode.parent);

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

  map(callback, addRouteCallback) {
    this.addRouteCallback = addRouteCallback;
    callback(bind(matcher('map'), this.rootState));
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
    let trailing = '';
    let originalPath = '';

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

    // Remove leading slashes as they're not matched.
    path = path.replace(/^[\/]/, '');

    // Find out if we have a trailing slash.
    if (path.charCodeAt(path.length - 1) === 47) {
      trailing = '/';
    }

    // Remove trailing slashes as they're not matched.
    path = path.replace(/[\/]$/, '');
    originalPath = path + trailing;

    // Adjacent mid-route segments in a route definition
    // are treated as an empty-string static segment.
    // No special handling required.

    // Handle normalization.
    if (this.ENCODE_AND_DECODE_PATH_SEGMENTS) {
      path = normalizePath(path);
    } else {
      path = decodeURI(path);
      originalPath = decodeURI(originalPath);
    }

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
      nextSet = NFATransition(nextSet, segment);
    } while (nextSet.length && segment !== undefined);

    // Short-circuit exit.
    if (nextSet.length === 0) {
      return null;
    }

    // Unroll this loop to prevent a branch.
    let solution = this._process(nextSet[0], originalPath, trailing, queryParams);
    let current;
    for (let i = 1; i < nextSet.length; i++) {
      current = this._process(nextSet[i], originalPath, trailing, queryParams);
      solution = moreSpecific(solution, current);
    }

    return solution;
  }

  toJSON() {
    // Rebuild the names property as a series of ID references.
    var names = {};
    for (var x in this.names) {
      if (!this.names.hasOwnProperty(x)) { return; }
      names[x] = this.names[x].id;
    }

    return {
      names: names,
      nodes: this.nodes
    };
  }
}

RouteRecognizer.Normalizer = Normalizer;
RouteRecognizer.VERSION = '0.0.0';
RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;

return RouteRecognizer;

})));