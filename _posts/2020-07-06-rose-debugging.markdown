---
layout: post
title: "Debugging Translators"
author: "@vec4"
date: 2020-07-06
categories: beginner
tags: [rose,debugging]
image: freecompilercamp/pwc:rose-debug
---

# Tips:

Code snippets are shown in one of three ways throughout this environment:

1. Code that looks like `this` is sample code snippets that is usually part of
   an explanation.
2. Code that appears in box like the one below can be clicked on and it will
   automatically be typed in to the appropriate terminal window:
   ```.term1
   vim readme.txt
   ```

3. Code appearing in windows like the one below is code that you should type in
   yourself. Usually there will be a unique ID or other bit your need to enter
   which we cannot supply. Items appearing in <> are the pieces you should
   substitute based on the instructions.  
   ```
   Add your name here - <name>
   ```

## Features ##
Writing translators in ROSE can be complex and certainly prone to subtle errors. Fortunately, the [gdb debugger](https://www.gnu.org/software/gdb/) can be used to debug ROSE translators. In this tutorial, we will take a look at the debug process in ROSE to make sure your tools work as expected.

## Introduction ##
Your translator *and ROSE itself* must be built with the`-g` flag and without gcc optimizations in order to preserve all debug information. The terminal environment for this tutorial contains a specialized image with ROSE built with debugging support. If you would like to configure your own ROSE environment with debugging support, you can add the following options to your normal configuration:
```
../rose/configure --with-CXX_DEBUG=-g --with-C_OPTIMIZE=-O0 --with-CXX_OPTIMIZE=-O0 ...
```

You can check what options were used to build ROSE by viewing the `config.log` file in the build tree:
```.term1
head ${ROSE_BUILD}/config.log
```
If you see the configuration flags above, ROSE is all set for debugging.

Before debugging, you should make sure that your input code can be handled by ROSE's builtin identity translator (for example, `rose-compiler input.cxx`) in order to ensure that there are no errors with the input code itself. Your input code should also be as small as possible and be localized to the error of interest (i.e., trigger only the error you are interested in). It is very difficult to debug translators that process thousands of lines of code.

The choice of debugger for ROSE translators and ROSE itself is gdb. gdb is a debugger that provides a controlled execution environment for you to inspect your program and determine if it is running the way you expect. Like most debuggers, it allows you to set breakpoints at points in your program and analyze how variables and other information changes as you control execution.

## Debugging Your Translator ##
If your translator is built without libtool, we can just use gdb as usual. For libtool built translators (usually this is for internal ROSE translators), some additional steps are needed that we will discuss at the end of this tutorial. Be sure your translator is compiled with the `-g` flag to enable debugging information!  

The usual steps for a debugging session are:
  1. Set a breakpoint
  2. Examine the execution path to make sure the program goes through the path that you expected
  3. Examine the local data to validate their values

#### Example ####
Let's go through an example of debugging a simple ROSE translator that performs an AST traversal and counts the number of for loops appearing in the source code, the same traversal performed in ROSE AST traversal tutorial. You may want to refresh yourself on what this translator does by viewing its source code:

```.term1
cat -n ${ROSE_SRC}/tutorial/visitorTraversal.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// ROSE is a tool for building preprocessors, this file is an example preprocessor built with ROSE.
// rose.C: Example (default) ROSE Preprocessor: used for testing ROSE infrastructure

#include "rose.h"

class visitorTraversal : public AstSimpleProcessing
   {
     public:
          visitorTraversal();
          virtual void visit(SgNode* n);
          virtual void atTraversalEnd();
   };

visitorTraversal::visitorTraversal()
   {
   }

void visitorTraversal::visit(SgNode* n)
   {
     if (isSgForStatement(n) != NULL)
        {
          printf ("Found a for loop ... \n");
        }
   }

void visitorTraversal::atTraversalEnd()
   {
     printf ("Traversal ends here. \n");
   }

int
main ( int argc, char* argv[] )
   {
  // Initialize and check compatibility. See Rose::initialize
     ROSE_INITIALIZE;

     if (SgProject::get_verbose() > 0)
          printf ("In visitorTraversal.C: main() \n");

     SgProject* project = frontend(argc,argv);
     ROSE_ASSERT (project != NULL);

  // Build the traversal object
     visitorTraversal exampleTraversal;

  // Call the traversal function (member function of AstSimpleProcessing)
  // starting at the project node of the AST, using a preorder traversal.
     exampleTraversal.traverseInputFiles(project,preorder);

     return 0;
   }
{% endhighlight %}
</figure>

</details>

Essentially, we perform a standard pre-order AST traversal and search for `SgForStatement` nodes that represent for loops.

We need to build this tool in order to debug it. In previous tutorials, we often used the default makefile included in the `${ROSE_BUILD}/tutorial` directory to build tutorial translators. However, this makefile uses libtool to build the executable script for the translator. We will look at how to debug libtool-based executables later in this chapter; here, instead, we will use a simple makefile that builds an x86_64 executable with gcc that gdb recognizes with no additional setup.

The following commands obtain the makefile from our GitHub repository and build the `visitorTraversal` translator with the `-g` flag included to support debugging symbols. We also need some input code for our translator to run on, so we obtain this here as well as `traversal_ex.cxx`. The input code contains two for loops at lines 19 and 40.

```.term1
mkdir ${ROSE_BUILD}/tutorial/debugging && cd "$_"
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-debugging/Makefile
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-debugging/traversal_ex.cxx
make
```

<details class="code-container">
<summary>Click here to view source code.</summary>

<figure class="lineno-collapsible">
{% highlight c++ linenos %}
// Templated class declaration used in template parameter example code
template <typename T>
class templateClass
   {
     public:
          int x;
          void foo(int);
          void foo(double);
   };

// Overloaded functions for testing overloaded function resolution
void foo(int);

void foo(double)
   {
     int x = 1;
     int y;

     for (int i=0; i < 4; i++)
        {
          int x;
        }

  // Added to allow non-trivial CFG
     if (x)
        y = 2;
     else
        y = 3;
   }

int main()
   {
     foo(42);
     foo(3.14159265);

     templateClass<char> instantiatedClass;
     instantiatedClass.foo(7);
     instantiatedClass.foo(7.0);

     for (int i=0; i < 4; i++)
        {
          int x;
        }

     return 0;
   }
{% endhighlight %}
</figure>

</details>

Finally, let's take a look at the output of the translator by running it with the supplied input code. As we expect, it finds two for loops during the traversal.

```.term1
./visitorTraversal traversal_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to view output.</summary>

<figure class="lineno-container">
{% highlight linenos %}
Found a for loop ...
Found a for loop ...
Traversal ends here.
{% endhighlight %}
</figure>

</details>

#### Debugging Our Example ####
Now, let's take a look at a sample debugging process for the above example.

To start gdb with the translator and its arguments, we use

```.term1
gdb -args ./visitorTraversal traversal_ex.cxx
```

At this point, we are running the gdb debugger and any commands issued while in the debugging environment pertain to gdb.

It is usually good practice to run the program without setting breakpoints first to see if it can run normally, or to reproduce an assertion failure or segmentation fault. We can do this with the `r` command while in gdb debugging mode. In this case, our translator runs without any error and prints the expected output.

Next, let's set a breakpoint line 22 of the translator; i.e., the line `printf ("Found a for loop ... \n");`. To set the breakpoint here, we use command

```.term1
b visitorTraversal.C:22
```

We expect this breakpoint to be hit two times since our input code has two loops. We can verify this with gdb. First, use command `r` to run the program from the top. It will stop at the first breakpoint it encounters, i.e., our breakpoint at line 22. Once the breakpoint has been hit, we can use `c` to continue the execution, at which point our first print statement for a found for loop is output. You will then see that the breakpoint has been hit again, corresponding to the second for loop, which we can then continue execution by using `c` again to print the second statement for a found for loop. At this point, the program terminates as it has completed the traversal without triggering anymore breakpoints.

Next, let's inspect some variables when our breakpoints are triggered. Rerun the program with `r`, which will hit the breakpoint. Here we can print information about variables in the current stack frame. For example, we may want to check if `n` is indeed an `SgForStatement` IR node. To do this, we simply use

```.term1
p isSgForStatement(n)
```

Note that the casted `n` is indeed of the type we expect. Of course, we also have access to all of `SgForStatement`'s member functions from within gdb. For example, we may interested in checking where the currently processed for loop appears in the source program. We can obtain this by

```.term1
p isSgForStatement(n)->get_file_info()->get_line()
```

As mentioned before, the first for loop is on line 19, as confirmed by our debugging process. As a self exercise, you may want to continue the process to print the source code location of the second for loop.

## Useful Debugging Tips for Your Translators ##
The above example shows a simple process of debugging a translator written for ROSE. Here, we describe some useful tips when debugging your own, larger translators. We will continue to use the same translator for illustration.

#### Inspect `post_construction_initialization()` ####
Breakpoints set at the `post_construction_initialization()` are useful to inspect when a node is created and/or if a node has required fields set after construction. For example, going through the callstack (using `up` and `down` commands in gdb) leading to this function call can inspect if the node has parent or scope pointers set. If not, you can add such operations to fix bugs related to NULL pointers.

To show this, let's set a breakpoint at this function of `SgForStatement`. We will also disable the breakpoint from the previous section.

```.term1
b SgForStatement::post_construction_initialization()
disable 1
```

We can view some information about existing breakpoints with `info breakpoints`:

```.term1
info breakpoints
```

Let's now run the program until the second breakpoint is hit by using command `r`. Use option `y` if gdb asks if you would like to restart the program from the beginning.

Once the breakpoint for the `post_construction_initialization()` function is reached, we could take a look at the function call stacks leading to this stop of the breakpoint with command `bt`. Note you can clearly see the callchain from the main function all the way to the breakpoint. This can be very useful for debugging purposes.

Finally, we can finish our current debugging execution with command `c` to continue, which will trigger the breakpoint once more on the passthrough for the second for loop. Issuing `c` again will complete the execution.

#### Set Conditional Breakpoints ####
In real codes, there are hundreds of objects of the same class type (e.g., `SgForStatement`). Many of them come from header files and will be present in the AST. We should only stop when it matches the one we want to inspect. Often, we can use the memory address of the object as a condition.

In gdb, this is a somewhat syntactically tricky. For example, the command below adds a condition to our second breakpoint to ensure we stop only when the pointer is equal *to the `SgForStatement` corresponding to the second for loop* (recall that each for loop is a separate IR node in the AST). We have to check the memory address, but we have this readily available from our debugging in the previous section when we triggered the `post_construction_initialization()` breakpoint on the second time. You should replace `<memory_address>` with the address printed by the triggering of the second breakpoint (where it says `this=<memory_address>`).

```.term1
cond 2 (unsigned long)this==(unsigned long)<memory_address>
```

Now, when we run the program with `r`, we see that execution is stopped only when the condition for breakpoint 2 is met, skipping all other hits to that breakpoint.

When you are ready, you should complete the debugging execution with `c`. This time we only need to issue it once, since we only stopped on the second and final for loop.

#### Use Watchpoints ####
You can use a watchpoint to stop execution whenever the value of an expression changes, without having to predict a particular place where this may happen (this is sometimes called a data breakpoint).

Watchpoints can be treated as special types of breakpoints. They will stop when the watched memory locations have value changes. This is especially useful when you want to know when some variable (or field of an object) is set to some value or cleared its value. For example, often a bug is related to some NULL value of some fields of a node. The fields may be set during construction of the node. But later mysteriously one field becomes NULL. It is extremely hard to find when this happens without using watchpoint.

For example, we want to watch the value changes to the parent field of the `SgForStatement` matching the memory address of the 2nd loop.

  * We first stop at a breakpoint where we have access to the node's internal fields. This usually is done by stopping at `SgForStatement::post_construction_initialization()`.
  * Once the internal variables are visible in gdb at the proper breakpoint, we can grab the memory address of the internal variable. This requires your knowledge of how internal variables are named. You can either look at the class declaration of the object, or guess it by convention. For example, mostly something with an access function like `get_something()` has a corresponding internal variable named `p_something` in ROSE AST node types.
  * Finally, we have to watch the dereferenced value of the memory address (`watch *address`). Watching the memory address (via `watch address`) is to watch a constant value. It won't work.

Run the program again with `r` while in debugging mode. As before, the second for loop will be reached due to our conditional breakpoint; all others will be skipped. Let's watch the data member storing the parent pointer of the AST node. We need to first obtain the memory address corresponding to this pointer, which can be output via `p &p_parent`. With the memory address obtained, we can set a watchpoint with the memory address. Remember, we *must* dereference the address! You should replace `<memory_address>` with the address printed by the previous command.

```.term1
p &p_parent
watch *<memory_address>
```

Now, we can watch the value changes to this memory address as the program executes. Restart the program from the beginning with command `r`. Notice that any value changes are displayed. It is useful to then view the stack trace via the `bt` command to check when the first time the value is changed by the constructor of the ancestor node `SgNode`.

Continuing the execution with `c` will show another value change to the address by the `post_construction_initialization()` function. An additional `c` will reveal that the `p_parent` field is changed by a call to `set_parent()`. We could then inspect the call stack and other things of interests with `bt`.

Finishing the execution with an additional `c` will complete the run and no more value changes to the memory address will be output, as expected.

## Debugging libtool-based and In-Tree ROSE Translators ##
Translators internal to ROSE (also called in-tree ROSE translators) are built using libtool. You may also end up building your own translators with libtool in the future. Because ROSE uses libtool, the executables in the build tree are not real executables; they are only wrappers around the actual executable files. As a result, we cannot simply use gdb as before.

Instead, there are two choices:
  1. Find the real executable in the .lib directory then debug the real executables there
  2. Use libtool command line as follows (recommended):
  ```shell
  libtool --mode=execute gdb --args ./built_in_translator file1.c
  ```

If you can set up alias command in your .bashrc, add the following:
```shell
alias debug='libtool --mode=execute gdb -args'
```
then all your debugging sessions can be as simple as
```shell
debug ./built_in_translator file1.c
```

The remaining steps are the same as a regular gdb session with the typical operations, such as breakpoints, printing data, etc.

## Additional Resources ##
  * Additional gdb resources include this [cheat sheet](https://kapeli.com/cheat_sheets/GDB.docset/Contents/Resources/Documents/index), [this guide](https://beej.us/guide/bggdb/), and the [official documentation](https://www.gnu.org/software/gdb/documentation/). This [resource](https://github.com/MattPD/cpplinks/blob/master/debugging.md#gdb) from @MattPD also contains a heap of useful gdb and C++ debugging resources.
  * Some examples of debugging libtool-based and in-tree ROSE translators can be found [here](https://en.wikibooks.org/wiki/ROSE_Compiler_Framework/How_to_debug_a_translator#A_translator_shipped_with_ROSE). This page also contains a small crash course in gdb.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-06-rose-debugging.markdown)
