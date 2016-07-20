// This function adds all of the epsilon segments to current set.
function descendantEpsilonSegments(set) {
  // This is effectively recursive because set gets mutated.
  for (var i = 0; i < set.length; i++) {
    set = set.concat(set[i].children.epsilonSegments);
  }

  return set;
}

// This function is invoked on consumption of the last consumed segment.
function undefinedSegment(set) {
  return set.filter(function(node) {
    return node.handler;
  });
}

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

    // 5. All "recursive" epsilon segments of this current set.
    nextSet = descendantEpsilonSegments(set);

    // Handle the last segment by filtering for accepting states.
    nextSet = undefinedSegment(nextSet);
  }

  return nextSet;
}
