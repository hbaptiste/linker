/* object assign */
var isPlainObject = require("is-plain-object");
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

var states = {"PENDING": 0, "PROCESSING": 1, "ABORTED": 2};

var Linker = function(start, settings) {
  'use strict';
  if (arguments.length === 1) {
    if (isPlainObject(start)) { settings = start; }
    if (!isPlainObject(start) && typeof start !== "function") {
      throw new Error("LinkerException: [start] should be a function!");
    }
  }

  settings = (settings !== undefined && typeof settings === 'object') ? settings : {};
  this.settings = Object.assign({}, { strict: true }, settings);
  this.queue = [];
  this.current = 0;
  this.funcInfos = {};
  this.callbacks = {};
  this.state = states.PENDING;
  this._linkerParamName = "$linker";
  this.results = [];

  if (typeof start === "function") {
    this.link(start);
  }



   var defaultError = function () {
    this.hasError = true;
    this.states = states.ABORTED;
   }
   this.onError(defaultError.bind(this));
}

Linker.prototype = {

  onComplete: function (callback) {
    if (typeof callback !== "function") {
        throw new Error("WrongParameterTypeException: onComplete() expects a function!");
    }
    this.callbacks.onComplete = callback;
    return this;
  },
    _checkParameters: function (asyncInfos, currentParams) {
        // if $linker is not the last parameter, expect the ghost param to be at the same position
        // if $linker is the last parameter, ghost can be absent OR at the same position

        var valid = false;
        if (asyncInfos.isLast) {
            if (currentParams.indexOf(this._linkerParamName) === -1) {
                valid = true;
            }
            if (currentParams.indexOf(this._linkerParamName) === asyncInfos.position) {
                valid = true;
            }
        }
        else {
            valid = (currentParams.indexOf(this._linkerParamName) === asyncInfos.position) || false;
        }

        return valid;
    },

  onError: function(callback) {
    if (typeof callback !== "function") {
      throw new Error("WrongParameterTypeException", "onError expects a function!");
    }

    this.callbacks.onError = (function(ctx, callback) {
      return function (exp) {
        ctx.hasError = true;
        callback(exp);
        if (ctx.settings.strict === false) {
            ctx.execNext({ error: exp });
        }
      }
    }(this, callback));
    return this;
  },

  link: function(func) {

    if (typeof func !== "function") {
      throw new Error("WrongParameterTypeException: link() was called without a function!")
    }
    var params = Array.apply(null, arguments);
    params.shift();
    this._checkType(func);
    var execNext = this.execNext.bind(this);
    var onError = (typeof this.callbacks.onError === "function") ? this.callbacks.onError: function () {};
    var asyncInfos = (typeof func.linkedInfos === 'number') ? { position: func.linkedInfos, isLast: func.isLast } : false;

    if (asyncInfos && !this._checkParameters(asyncInfos, params)) {
        throw new Error("WrongParameterPositionException: $linker position doesn't match with the called function definition!");
    }
    var self = this;

    /* redefine the main func, deal with error */
    var functionWrapper = function (func, async, params) {
          return function () {
              var nextFunc = function $next(funcResult) {
                return execNext(funcResult);
              };

              var $linker = {
                next: nextFunc,
                onError: onError
              };
              if (async) {
                /* async function */
                try {
                      params.splice(async.position, 1, $linker);
                      return func.apply(null, params);
                } catch (e) {
                    self.callbacks.onError(e); //deal with async error
                }
              }
              else {
                /* sync function */
                try {
                  var result = func.apply(null, params);
                  return nextFunc(result);
                } catch (e) {
                    self.callbacks.onError(e);
                }
              }
          }
        }
    this.queue.push(functionWrapper(func, asyncInfos, params));
    return this;
  },

  reset: function () {
    this.current = 0;
    this.queue = [];
    this.results = [];
  },

  execNext: function(result) {
    if (this.current !== 0) { this.results.push(result); }

    if ((this.hasError === true) && (this.settings.strict === true)) {
          this.reset(); // stop the execution
          return;
    }

    if (this.current === this.queue.length) {
      if (typeof this.callbacks["onComplete"] === "function") {
        this.callbacks.onComplete(this.results);
      }
      this.reset();
    }

    var func = this.queue[this.current];
    if (!func) {
      return false;
    }
    this.current++;
    return func(result);
  },

  end: function(func) {
    if (func && typeof func === 'function') {
      this.link(func);
    }
    if (!this.queue.length) { throw new Error("EmptyQueueException: a function must be provided!"); }
    this.execNext();
  },

  _checkType: function(func) {
    var COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var DEFAULT_PARAMS = /=[^,]+/mg;
    var FAT_ARROWS = /=>.*$/mg;

    var getParameterNames = function(fn) {
      var code = fn.toString()
        .replace(COMMENTS, '')
        .replace(FAT_ARROWS, '')
        .replace(DEFAULT_PARAMS, '');

      var result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
        .match(/([^\s,]+)/g);

      return result === null ? [] : result;
    }

    var funcArgs = getParameterNames(func);
    var nextIndex = funcArgs.indexOf(this._linkerParamName);
    var lastIndex = funcArgs.lastIndexOf(this._linkerParamName);
    if (nextIndex !== -1) {
      if (nextIndex !== lastIndex) {
          throw new Error("WrongParameterFormatException: the [linkerParam] was provided more than once");
      }
      func.linkedInfos = nextIndex;
      func.isLast = (nextIndex + 1 === funcArgs.length) ? true: false;
    }
    return func;
  }
};


module.exports = Linker;