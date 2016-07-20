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
export default function NFATransition(set, segment) {
  var nextSet = [];

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

    // 4. All "recursive" epsilon segments of this current set.
    nextSet = descendantEpsilonSegments(nextSet);

  } else {
    // Alternatively we're done before we even start.

    // 1. Add all "recursive" epsilon segments of this current set.
    nextSet = descendantEpsilonSegments(set);

    // 2. Handle this last segment by filtering for accepting states.
    nextSet = undefinedSegment(nextSet);
  }

  return nextSet;
}
