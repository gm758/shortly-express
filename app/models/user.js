var db = require('../config');
var Promise = require('bluebird');
var utils = require('../../lib/utility');

var Link = require('./link');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  links: function() {
    return this.hasMany('Link');
  },
  initialize: function() {
    // this.on('creating', function(model, attrs, options) {
    //   var promiseHash = Promise.promisify(utils.hashPassword);
    //   var that = this;
    //   return promiseHash(that.get('password'))
    //   .then(function(hash){
    //     model.set('password', hash);
    //   });
    // }, this);

    // this.on('fetching', function(model, attrs, options){
    //   var promiseCompare = Promise.promisify(utils.verifyPassword);
    //   var that = this;
    //   return promiseCompare(options.password, that.get('password')).then(function(result){
    //     console.log(result);
    //   });
    // }, this);

  }
});

module.exports = db.model('User', User);