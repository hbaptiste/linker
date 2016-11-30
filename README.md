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
  That was easy. Now, as are coding in JavaScript, let's transform our adder to an 	asynchronous function.
  
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
    When we are dealing with a asynchronous function, it must tell when the linker should move on to the next function.
    Where the $linker parameter comes from? We can look at it  as a contact between the linker and the function.
    if you define a function that accepts a $linker parameter it will be intepreted as the function want to manage how
    the linker should process its queue.
  
  
