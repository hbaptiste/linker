var Linker = require('../src/Linker');
var assert = require('assert');
var sinon = require('sinon');

var createfuncWrapper = function (resultHolder, async, valueToReturn, hasError) {

    if (async) {
        return function ($linker) {
            setTimeout(function () {
                if (hasError) {
                  try {
                    throw new Error("AsyncErrorJustForTest");
                  } catch (e) {
                    $linker.onError(e);
                  }
                  return false;
                }
                resultHolder.push(valueToReturn);
                $linker.next(valueToReturn);
            }, 100);
        }
    } else {
        return function () {
          if (hasError) { throw new Error("SyncErrorJustForTest"); }
           resultHolder.push(valueToReturn);
           return valueToReturn;
          }
    }
}

describe('Linker tests', function () {

    it("Should create a Linker instance", function () {
        var linker = new Linker();
        assert.equal("function", typeof linker.link);
        assert.equal("function", typeof linker.end);
        assert.equal("function", typeof linker._checkType);
    });

    it("Function queue must be empty when the provided parameter is not a function", function () {
        var l = new Linker();
        assert.equal(0, l.queue.length);
    });

    it("Should raise an exception if start parameter is provided but it's not a function", function () {
      try {
          var l = new Linker("sd");
          assert.ok(false);
      } catch (e) {
          assert.equal("LinkerException: [start] should be a function!", e.message);
      }
    });

    it("end() should throw an exception when no function was provided to the linker", function () {
        var l = new Linker();
        try {
            l.end();
            assert.ok(false);
        } catch(e) {

            assert.equal("EmptyQueueException: a function must be provided!", e.message);
        }
    });

    it ("When a start is provided the queue should not be empty", function () {
        var test = function () { return "test"; }
        var l = new Linker(test);
        assert.equal( 1 , l.queue.length);
    });


    it("link() should raise an exception when called with an objet that's not a function", function () {
      var l = new Linker();
      try {
        l.link();
        assert.ok(false)
      } catch (e) {
        assert.equal("WrongParameterTypeException: link() was called without a function!", e.message);
      }
    });


    it("Calling link should add a function to the queue", function () {
      var l = new Linker();
      var func = function () {}
        l.link(func);
        assert.equal(1, l.queue.length);
    });



    it ("When a function is provided to the linker, is should be executed when end is called", function () {
        var response = { value: 0};
        var testFunc = (function (response) {
          return function () {
              response.value = 1;
          }
        }(response));

        assert.deepEqual(response, {value: 0});

        var l = new Linker(testFunc);
        l.end();
        assert.deepEqual(response, {value : 1});
    });

    it("When a function is provided with link(), it should be executed when end() is called", function () {
      var func = sinon.spy();
      var fqueue = new Linker();
        fqueue.link(func);
        fqueue.end();
        assert.ok(func.called);
    });

    it("Calling end() should empty the queue", function () {
      var fn1 = sinon.spy();
      var funcQueue = new Linker(fn1);
      funcQueue.end();
      assert.ok(fn1.called);
      assert.equal(0, funcQueue.queue.length);
    });

    it("Linked sync functions should always be executed in the right order", function () {

      var func1 = sinon.spy();
      var func2 = sinon.spy();

      var functionQueue = new Linker();
      functionQueue.link(func1).link(func2).end();
      assert.equal(0, functionQueue.queue.length);
      func1.calledBefore(func2);

      functionQueue.link(func2).link(func1).end();
      func2.calledBefore(func1);
    });

    it("Should execute sync and async function in the right order", function () {
        var clock = sinon.useFakeTimers();

        var result = [];

        var func1 = createfuncWrapper(result, true, 2);
        var func2 = createfuncWrapper(result, false, 15)
        var func3 = createfuncWrapper(result, true, 3);
        var func4 = createfuncWrapper(result, false, 20);

        var funcQueue = new Linker();
            funcQueue.link(func1)
            funcQueue.link(func2)
            funcQueue.link(func3)
            funcQueue.link(func4)
            funcQueue.end();
        clock.tick(500);
        assert.deepEqual([2, 15, 3, 20], result);
      });



    it("Should execute onComplete when all functions have been executed", function () {
      var clock = sinon.useFakeTimers();
      var onComplete = sinon.spy();
      var funcQueue = new Linker();
      var result = [];
      var func1 = createfuncWrapper(result, true, 2);
      var func2 = createfuncWrapper(result,false, 14);
      funcQueue.onComplete(onComplete).link(func1).link(func2).end();
      clock.tick(500);
      assert.ok(onComplete.called);
    });

    it("Should executed onError if a function has an error", function () {
      var clock = sinon.useFakeTimers();
      var onError = sinon.spy();
      var funcQueue = new Linker();
      var result = [];
      var func1 = createfuncWrapper(result, true, 2);
      var func2 = createfuncWrapper(result, true, 14, true);
      funcQueue.onError(onError).link(func1).link(func2).end();
      clock.tick(500);
      assert.ok(onError.called);
    });

    it("Functions should be called with the right parameters", function () {
            var funcQueue = new Linker();
            var onComplete = sinon.spy();

            var adder = function adder(a, b) {
                    var result = a + b;
                    return result;
                  }

            var mult = function mult(a, b, c) {
              return a*b*c;
            }

            var divider = function divider(a,b) {
              return Math.ceil(a/b);
            }
            var id = function id (param) {
                return param;
            }
            var idParams = {'name': 'trovski','job': 'thinkerer', 'no': 23};
            funcQueue
              .link(divider, 10, 5)
              .link(adder, 1, 23)
              .link(mult, 10, 20, 3)
              .link(id, [idParams])
              .onComplete(onComplete)
              .end();

            assert(onComplete.calledWith([2, 24, 600, [idParams] ]));

    });

    it("Should trigger WrongParameterPositionException when $linker is not at the right position", function () {
        var linker = new Linker();
        var asyncAdder = function(a,b, $linker) {
          setTimeout(function () {
            $linker.next(a + b);
          },0);
        }

        var asyncMult = function (a, b, c) {
          return a*b*c;
        }
        try {
          linker.link(asyncAdder, 2, '$linker', 5).link(asyncMult, 10, 10, 9).end()
          assert(ok, false);
        } catch (e) {
          assert.equal("WrongParameterPositionException: $linker position doesn't match with the called function definition!", e.message);
        }
    });

    it("Handler function should be called with the right parameters when the queue has async functions", function () {

      var clock = sinon.useFakeTimers();
      var onComplete = sinon.spy();
      var linker = new Linker();

      var asyncAdder = function asyncAdder(a, b, $linker) {
            setTimeout(function () {
                var r = a + b;
                $linker.next(r);
            }, 100);
      }

      var id = function id(params) {
          return params;
      }

      var by2 = function (a) {
          return a*2;
      }

      var by3 = function($linker, a) {
          setTimeout(function () {
            $linker.next(a*3);
          }, 100);
      }

      var asyncMult = function asyncMult(a, b, c, $linker) {
        setTimeout(function () {
            $linker.next(a*b*c);
        }, 100);
      }

      linker
        .link(asyncAdder, 2, 5)
        .link(by2, 2)
        .link(id, 1)
        .link(by3, '$linker', 2)
        .link(asyncMult, 4, 5, 1, '$linker')
        .onComplete(onComplete)
        .end();

      clock.tick(500);

      assert(onComplete.calledWith([7, 4, 1, 6, 20]));
    });

    it("Should accept one $linker parameter", function () {
        var funcQueue = new Linker();
        var adder = function(a, b, $linker, $linker) {
            $linker.done(a + b);
        }
        try {
            funcQueue.link(adder).end();
            assert.ok(false);
        } catch (e) {
            assert.equal("WrongParameterFormatException: the [linkerParam] was provided more than once", e.message);
        }
    });

    it("Strict  mode should stop the execution of the remain functions in queue", function () {
      var clock = sinon.useFakeTimers();

      var queue = new Linker();
      var resultHolder = [];
      var onCompleteSpy = sinon.spy();

      var onError = sinon.spy();
      var func1 = createfuncWrapper(resultHolder, true, 2, false);
      var func2 = createfuncWrapper(resultHolder, true, 24, true);
      var func3 = createfuncWrapper(resultHolder, true, "this is my result", false);
      queue
      .link(func1)
      .link(func2)
      .link(func3)
      .onError(onError)
      .onComplete(onCompleteSpy)
      .end();
      clock.tick(500);
      assert.deepEqual(0, onCompleteSpy.callCount);
    });

    it("Non Strict mode should not stop the execution of the remain functions in the queue", function () {
        var clock = sinon.useFakeTimers();
        var resultHolder = [];
        var onError = sinon.spy();
        var onComplete = sinon.spy();
        var queue = new Linker({strict: false});
        var func1 = createfuncWrapper(resultHolder, true, 4);
        var func2 = createfuncWrapper(resultHolder, true, "RADICAL_BLAZE", true); //has error
        var func3 = createfuncWrapper(resultHolder, false, "Strange");
        queue
          .link(func1)
          .link(func2)
          .link(func3)
          .onError(onError)//mode -1 quand error execute next || garder la trace des fonctions déjà executées
          .onComplete(function () {
            onComplete.apply(this, arguments);
          })
          .end();
        clock.tick(500);
        assert(onComplete.calledWith([4, {error: new Error("AsyncErrorJustForTest")}, "Strange"])); //put exception in the queue.

    });
});


//Ajouter

module.exports = Linker;

