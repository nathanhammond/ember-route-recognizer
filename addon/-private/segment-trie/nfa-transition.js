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
