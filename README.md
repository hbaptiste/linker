# linker
A simple JS Queue synchronizer!

Linker allows you to execute a function queue in the right order regardless of the nature of the function.
A exemple will be more eloquent.

```javascript

var adder = function(a, b) { return a+b; }

var multiplyBy2 = function(a){ return a*2; }

var multiplyBy3 = function(a){ return a*3; }

var id = function (params){ return params; }


var linker = new Linker();
linker
  .link(multiplyBy2, 2)
  .link(multiplyBy3, 5)
  .link(adder, 5, 7)
  .link(id, 'test')
  .onComplete(function(result){
    console.log(result); //[4, 15, 12, 'test']
  }).end();
  
  ```
  First we create an instance of the linker. Then we add some functions the queue with link().
  We provide a callback to the onComplete method that will be called when all the functions will be executed.
  When we are done, we start to process the queue with end().
  
  That was easy. Now, as we are coding in JavaScript, asynchronous things will happen in you code! 
  Let's transform our adder to an asynchronous function and see how we can deal with that.
  
```javascript
  var adder = function(a, b, $linker) {
    setTimeout(function(){
      var result = a + b;
      $linker.next(result);
    }, 500);
  }

  var linker = new Linker();
  linker
    .link(adder, 10, 48)
    .link(adder, 45, 1)
    .link(id, 'same')
    .onComplete(function(result){
      console.log(result); // [58, 46, 'same']
    }).end();
    
   ```
