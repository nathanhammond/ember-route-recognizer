var patch = {
  _buildDSL: function() {
    this.router.map = function() {};
    this.router.recognizer = new RouteRecognizer(serialized);

    return {
      generate: function() {},
      route: function() {}
    };
  }
};
