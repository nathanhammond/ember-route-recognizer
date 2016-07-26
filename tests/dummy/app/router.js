import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('foo');
  this.alias('alias', '/elsewhere', 'foo');
});

export default Router;
