# linker
A simple JS Queue synchronizer!

Linker allows you to execute, in the right order, a queue of javascript functions regardless of their nature.
A exemple will be more eloquent.

```javascript

var adder = function(a, b) { return a+b; }

var multiplyBy2 = function(a) { return a*2; }

var multiplyBy3 = function(a) { return a*3; }

var id = function (params) { return params; }


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
  var multiplyBy3 = function(a, $linker) {
    setTimeout(function() {
      var r = a * 3;
      $linker.next(r);
    }, 700);
  } 
  
  var adder = function(a, b, $linker) {
    setTimeout(function() {
      var result = a + b;
      $linker.next(result);
    }, 500);
  }

  var linker = new Linker();
  linker
    .link(adder, 10, 48)
    .link(multiplyBy3, 5)
    .link(adder, 45, 1)
    .link(id, 'same')
    .onComplete(function(result) {
      console.log(result); // [58, 15, 46, 'same']
    }).end();
    
   ```
## Handling asynchronous function
When we are dealing with an asynchronous function, the latter has the responsability to tell the linker

when it should move on and execute the next function in the queue. Most of the time it will be when it's

done computing. You can think of it as the 'resolve' method of a promise.

Notice the $linker parameter in the adder function. Where does it come from? We can look at it  as a contact
between the linker and the function.

if you add to the queue a function that has a parameter named *$linker* the linker will understand that it will

have to wait for that function to allow it to move to the next function in the queue. 
That's what the call to $linker.next does!
If you are asking yourself again where does the next method come from; ask no more, buzzword coming through : 
Dependency Injection!

In other words, the linker knows how to call the adder() function with the right parameter.

## More about $linker

In the previous example the $linker was the last parameter. It's not mandatory. It's just convenient. When
$linker is the last parameter the linker just "knows" how to handle your function.

What if we decide to change or adder function? Let's just do that.

```javascript
var adder = function(a, $linker, b) {
  var r = a + b;
  $linker.next(r);
}
var linker = new Linker();
linker.
  link(adder, 13, '$linker', 10)
  .link(id, 'same')
  .onComplete(function(result) {
    console.log(result); //[23, 'same']
  })
  .end()
  
  ```
As the $linker is not the last parameter of the *adder* function, we MUST provide it as a *ghost* parameter 
when we want to call it with the linker.
