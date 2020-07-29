---
layout: post
title: "Inlining Transformations"
author: "@vec4"
date: 2020-07-17
categories: intermediate
tags: [rose, inlining]
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

---

## Features ##
**Inlining** is a compiler optimization that replaces a function call with the body of the called function, reducing or eliminating the overhead in calling the function. Most often, inlining is useful for small functions that are frequently called and is used for more complex optimizations. However, there is a tradeoff between space/memory usage and overhead reduction, as an inlined function will have its body duplicated, possibly more than once (one time for each time the function is inlined). Note, also, that the compiler is free to ignore inlining suggestions.

In this tutorial, we will look at how to use the inliner mechanism in ROSE.

## A. Inliner Mechanism in ROSE ##
The main API reference for inlining in ROSE is the `doInline()` function defined in the ROSE midend. It has the following form:

```c++
bool doInline(SgFunctionCallExp* funcall, bool allowRecursion);
```

This function accepts a function call as a parameter, and inlines *only* that single function call. It returns true if it succeeded and false otherwise. Below are the following types of functions that can be inlined (i.e., the function call must be to a function of the type below). We note that the first part of the source of the `doInline()` function is an eligibility check that checks the conditions below.

  * A named function,
  * Static member function,
  * Qualified name does not start with `::std::`
  * Non-virtual non-static member function
  * The function must be known (i.e., not through a function pointer or member function pointer)
  * The body of the function must already be visible in the current AST.

Recursive procedures are handled properly when the boolean `allowRecursion` is set, by inlining one copy of the procedure into itself. Any other restrictions on what can be inlined are bugs in the inliner code.

## B. Example Inline Translator ##

Let's take a look at a translator that makes use of the `doInline()` function and attempts to inline function calls until it cannot inline anything else or some limit is reached (in this case, 10 times), whichever comes first.

```.term1
cat -n ${ROSE_SRC}/tests/nonsmoke/functional/roseTests/astInliningTests/inlineEverything.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>
<figure class="lineno-container">
{% highlight c++ linenos %}
// This test attempts to inline function calls until I cannot inline anything else or some limit is reached.
#include "rose.h"
#include <vector>
#include <string>
#include <iostream>

using namespace Rose;
using namespace std;

// Finds needle in haystack and returns true if found.  Needle is a single node (possibly an invalid pointer and will not be
// dereferenced) and haystack is the root of an abstract syntax (sub)tree.
static bool
isAstContaining(SgNode *haystack, SgNode *needle) {
    struct T1: AstSimpleProcessing {
        SgNode *needle;
        T1(SgNode *needle): needle(needle) {}
        void visit(SgNode *node) {
            if (node == needle)
                throw this;
        }
    } t1(needle);
    try {
        t1.traverse(haystack, preorder);
        return false;
    } catch (const T1*) {
        return true;
    }
}

// only call doInlinine(), without postprocessing or consistency checking. Useful to debugging things.
static bool e_inline_only= false;

int
main (int argc, char* argv[]) {

  // Build the project object (AST) which we will fill up with multiple files and use as a
  // handle for all processing of the AST(s) associated with one or more source files.
  std::vector<std::string> argvList(argv, argv+argc);


  if (CommandlineProcessing::isOption(argvList,"(-h|-help|--help)","", false))
  {
    cout<<"---------------------Tool-Specific Help-----------------------------------"<<endl;
    cout<<"This is a program transformation tool to inline function calls in your C/C++ or Fortran code."<<endl;
    cout<<"Usage: "<<argvList[0]<<" -c [options] "<< "input.c"<<endl;
    cout<<endl;
    cout<<"The optional options include: "<<endl;
    cout<<" -skip-postprocessing: Skip postprocessing which cleanups code"<<endl;
    cout<<" -process-headers:     Process calls within header files"<<endl;
    cout<<" -verbose:            Printout debugging information"<<endl;
    cout<<"----------------------Generic Help for ROSE tools--------------------------"<<endl;
  }

  // inlining only, without any post processing of AST
  if (CommandlineProcessing::isOption (argvList,"-skip-postprocessing","", true))
  {
    cout<<"Skip postprocessing which cleans up the code...."<<endl;
    e_inline_only = true ;
  }
  else
    e_inline_only = false;

  // skip calls within headers or not
  if (CommandlineProcessing::isOption (argvList,"-process-headers","", true))
  {
    Inliner::skipHeaders = false;
    cout<<"Processing calls within header files ...."<<endl;
  }
  else
    Inliner::skipHeaders = true;

  if (CommandlineProcessing::isOption (argvList,"-verbose","",false))
  {
    Inliner::verbose= true;
    cout<<"Turning on verbose mode ...."<<endl;
  }
  else
    Inliner::verbose= false;

  SgProject* sageProject = frontend(argvList);

  AstTests::runAllTests(sageProject);
  std::vector <SgFunctionCallExp*> inlined_calls;

  // Inline one call at a time until all have been inlined.  Loops on recursive code.
// this is essentially recursion by default.
  int call_count =0;
  size_t nInlined = 0;
  for (int count=0; count<10; ++count) {
    bool changed = false;
    BOOST_FOREACH (SgFunctionCallExp *call, SageInterface::querySubTree<SgFunctionCallExp>(sageProject)) {
      call_count++;
      if (doInline(call)) {
        ASSERT_always_forbid2(isAstContaining(sageProject, call),
            "Inliner says it inlined, but the call expression is still present in the AST.");
        ++nInlined;
        inlined_calls.push_back(call);
        changed = true;
        break;
      }
    }
    if (!changed)
      break;
  }
  std::cout <<"Test inlined " <<StringUtility::plural(nInlined, "function calls") << " out of "<< call_count<< " calls." <<"\n";
  for (size_t i=0; i< inlined_calls.size(); i++)
  {
    std::cout <<"call@line:col " <<inlined_calls[i]->get_file_info()->get_line() <<":" << inlined_calls[i]->get_file_info()->get_col() <<"\n";
  }

  // Post-inline AST normalizations

  // DQ (6/12/2015): These functions first renames all variable (a bit heavy handed for my tastes)
  // and then (second) removes the blocks that are otherwise added to support the inlining.  The removal
  // of the blocks is the motivation for renaming the variables, but the variable renaming is
  // done evarywhere instead of just where the functions are inlined.  I think the addition of
  // the blocks is a better solution than the overly agressive renaming of variables in the whole
  // program.  So the best solution is to comment out both of these functions.  All test codes
  // pass (including the token-based unparsing tests).
  // renameVariables(sageProject);
  // flattenBlocks(sageProject);

  if (!e_inline_only)
  {
    // This can be problematic since it tries to modifies lots of things, including codes from headers which are not modified at all.
    cleanupInlinedCode(sageProject);
    changeAllMembersToPublic(sageProject);
    AstTests::runAllTests(sageProject);
  }

  return backend(sageProject);
}
{% endhighlight %}
</figure>
</details>

There is a lot going on in this translator, but the actual inlining component is relatively simple. Let's deconstruct the tool and look at it component-by-component.

Starting with the `main()` function, the first component on lines 38-78 simply sets up argument parsing for the tool. This translator provides several options, including one `-skip-postprocessing`, which skips the post-prorcessing step. Post-processing in the context of ROSE inliner cleans up the inlined code by removing unused labels, null statements, etc. In this tutorial, we will use post-processing. Some other options include parsing calls in header files and enabling verbose output.

Lines 80-83 then setup the ROSE frontend and construct a container of inlined calls, `inlined_calls`.

The main focus of this translator is on lines 85-109, shown below. This is where we call the `doInline()` function.

<figure class="customlines-container">
{% highlight c++ %}
85  // Inline one call at a time until all have been inlined.  Loopson recursive code.
86  // this is essentially recursion by default.
87  int call_count =0;
88  size_t nInlined = 0;
89  for (int count=0; count<10; ++count) {
90    bool changed = false;
91    BOOST_FOREACH (SgFunctionCallExp *call, SageInterface::querySubTree<SgFunctionCallExp>(sageProject)) {
92      call_count++;
93      if (doInline(call)) {
94        ASSERT_always_forbid2(isAstContaining(sageProject, call),
95          "Inliner says it inlined, but the call expression is still present in the AST.");
96        ++nInlined;
97        inlined_calls.push_back(call);
98        changed = true;
99        break;
100     }
101   }
102   if (!changed)
103     break;
104 }
105 std::cout <<"Test inlined " <<StringUtility::plural(nInlined, "function calls") << " out of "<< call_count<< " calls." <<"\n";
106 for (size_t i=0; i< inlined_calls.size(); i++)
107 {
108   std::cout <<"call@line:col " <<inlined_calls[i]->get_file_info()->get_line() <<":" << inlined_calls[i]->get_file_info()->get_col() <<"\n";
109 }
{% endhighlight %}
</figure>

Lines 87 and 88 setup our counting variables: one for the number of times we have seen a function call and another for the number of times we have inlined a function call. Next, we iterate until the limit of inlining has been reached (in this case, this limit is 10 times). Recall that we will stop early if we cannot find any more function calls to inline, and we inline one call at a time.

We need to keep track of whether or not we have inlined anything for the current iteration, indicated by the `changed` boolean. We then iterate over each `SgFunctionCallExp` IR node in the AST, starting from the root, and call the `doInline()` function to inline the current call. If successful, we double check if the call has actually been inlined via the assert online 94-95. To do this, we use a special helper function `isAstContaining`, defined on lines 12-28, which searches for a specific function call in the AST.

We then increase our inlined counter, add the inlined call to the container, set the inlined flag to true, and quit the inner `BOOST_FOREACH` loop. The outer for loop then continues and we attempt to inline the next found function call. When no more function calls are left to be inlined, the `changed` flag is never set, and so lines 102-103 will quit the process. This is assuming that the limit of 10 inlines has not been reached. We then output some information on lines 105-109.

Finally, let's take a look at lines 123-129 that perform post-processing. Here, we call two post-processing functions to remove labels, empty statements, etc, assuming that the user has not set the `-skip-postprocessing` command line argument.

<figure class="customlines-container">
{% highlight c++ %}
123 if (!e_inline_only)
124 {
125   // This can be problematic since it tries to modifies lots of things, including codes from headers which are not modified at all.
126   cleanupInlinedCode(sageProject);
127   changeAllMembersToPublic(sageProject);
128   AstTests::runAllTests(sageProject);
129 }
{% endhighlight %}
</figure>

## C. Example Input ##
The inline mechanism in ROSE is high-level and easy to use. However, inlining can become complex when using more complicated input source code. Here, we illustrate a few inlining examples of increasing complexity.

Let's first build this tool.

```.term1
cd ${ROSE_BUILD}/tests/nonsmoke/functional/roseTests/astInliningTests/
make inlineEverything
```

#### Naked Call ####
First, let's test the inliner with the following code. Here, we have a naked call with no parameter nor return output.

<figure class="lineno-container">
{% highlight c++ linenos %}
extern int x;

void incrementX() {
  x++;
}

int main() {
  incrementX();
  return x;
}
{% endhighlight %}
</figure>

We can run the inliner translator on this code via the commands below.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-inlining/nakedInput.cpp
./inlineEverything -c nakedInput.cpp
```

And view the output as below.

```.term1
cat -n rose_nakedInput.cpp
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
extern int x;

void incrementX()
{
  x++;
}

int main()
{
{
    x++;
  }
  return x;
}
{% endhighlight %}
</figure>

</details>

Note that ROSE has placed the function body of the `incrementX()` function in place of the function call, showing a successful simple inline operation.

#### Function Calls as Two Expressions ####
The input code below contains function calls as two expressions.

<figure class="lineno-container">
{% highlight c++ linenos %}
int foo(int i) {
  return 5+i;
}

int main(int, char**) {
  int w;
  w = foo(1)+ foo(2);
  return w;
}
{% endhighlight %}
</figure>

We can run the inlining translator on this code via the commands below.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-inlining/twoExp.cpp
./inlineEverything -c twoExp.cpp
```

And view the output as below.

```.term1
cat -n rose_twoExp.cpp
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}

int foo(int i)
{
  return 5 + i;
}

int main(int ,char **)
{
  int rose_temp__4;
{
{
      rose_temp__4 = 5 + 1;
      goto rose_inline_end__3;
    }
    rose_inline_end__3:
    ;
  }
  int rose_temp__8;
{
{
      rose_temp__8 = 5 + 2;
      goto rose_inline_end__7;
    }
    rose_inline_end__7:
    ;
  }
  int w = rose_temp__4 + rose_temp__8;
  return w;
}
{% endhighlight %}
</figure>

</details>

In this case, you can see that a temporary variable is used to capture the returned value of a function call. Then, this temporary variable is used to replace the original function call expression. Post-processing does not simplify this code any further.

#### Recursive Calls ####
The input code below has recursive calls as part of a factorial computation. The ROSE inliner can handle recursive calls.

<figure class="lineno-container">
{% highlight c++ linenos %}
int fact(int n) {
  if (n == 0)
    return 1;
  else
    return n * fact(n - 1);
}

int main(int, char**) {
  return !(fact(5) == 120);
}
{% endhighlight %}
</figure>

Use the commands below to run the inliner on this recursive code.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-inlining/recursive.cpp
./inlineEverything -c recursive.cpp
```

And view the output as below.

```.term1
cat -n rose_recursive.cpp
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}

int fact(int n)
{
  if (n == 0)
    return 1;
   else
    return n * fact(n - 1);
}

int main(int ,char **)
{
  int rose_temp__4;
{
    if (5 == 0) {
      rose_temp__4 = 1;
      goto rose_inline_end__3;
    }
     else {
      int rose_temp__8;
{
        int n__6 = 5 - 1;
        if (n__6 == 0) {
          rose_temp__8 = 1;
          goto rose_inline_end__7;
        }
         else {
          int rose_temp__12;
{
            int n__10 = n__6 - 1;
            if (n__10 == 0) {
              rose_temp__12 = 1;
              goto rose_inline_end__11;
            }
             else {
              int rose_temp__16;
{
                int n__14 = n__10 - 1;
                if (n__14 == 0) {
                  rose_temp__16 = 1;
                  goto rose_inline_end__15;
                }
                 else {
                  int rose_temp__20;
{
                    int n__18 = n__14 - 1;
                    if (n__18 == 0) {
                      rose_temp__20 = 1;
                      goto rose_inline_end__19;
                    }
                     else {
                      int rose_temp__24;
{
                        int n__22 = n__18 - 1;
                        if (n__22 == 0) {
                          rose_temp__24 = 1;
                          goto rose_inline_end__23;
                        }
                         else {
                          int rose_temp__28;
{
                            int n__26 = n__22 - 1;
                            if (n__26 == 0) {
                              rose_temp__28 = 1;
                              goto rose_inline_end__27;
                            }
                             else {
                              int rose_temp__32;
{
                                int n__30 = n__26 - 1;
                                if (n__30 == 0) {
                                  rose_temp__32 = 1;
                                  goto rose_inline_end__31;
                                }
                                 else {
                                  int rose_temp__36;
{
                                    int n__34 = n__30 - 1;
                                    if (n__34 == 0) {
                                      rose_temp__36 = 1;
                                      goto rose_inline_end__35;
                                    }
                                     else {
                                      int rose_temp__40;
{
                                        int n__38 = n__34 - 1;
                                        if (n__38 == 0) {
                                          rose_temp__40 = 1;
                                          goto rose_inline_end__39;
                                        }
                                         else {
                                          rose_temp__40 = n__38 * fact(n__38 - 1);
                                          goto rose_inline_end__39;
                                        }
                                        rose_inline_end__39:
                                        ;
                                      }
                                      rose_temp__36 = n__34 * rose_temp__40;
                                      goto rose_inline_end__35;
                                    }
                                    rose_inline_end__35:
                                    ;
                                  }
                                  rose_temp__32 = n__30 * rose_temp__36;
                                  goto rose_inline_end__31;
                                }
                                rose_inline_end__31:
                                ;
                              }
                              rose_temp__28 = n__26 * rose_temp__32;
                              goto rose_inline_end__27;
                            }
                            rose_inline_end__27:
                            ;
                          }
                          rose_temp__24 = n__22 * rose_temp__28;
                          goto rose_inline_end__23;
                        }
                        rose_inline_end__23:
                        ;
                      }
                      rose_temp__20 = n__18 * rose_temp__24;
                      goto rose_inline_end__19;
                    }
                    rose_inline_end__19:
                    ;
                  }
                  rose_temp__16 = n__14 * rose_temp__20;
                  goto rose_inline_end__15;
                }
                rose_inline_end__15:
                ;
              }
              rose_temp__12 = n__10 * rose_temp__16;
              goto rose_inline_end__11;
            }
            rose_inline_end__11:
            ;
          }
          rose_temp__8 = n__6 * rose_temp__12;
          goto rose_inline_end__7;
        }
        rose_inline_end__7:
        ;
      }
      rose_temp__4 = 5 * rose_temp__8;
      goto rose_inline_end__3;
    }
    rose_inline_end__3:
    ;
  }
  return (!(rose_temp__4 == 120));
}
{% endhighlight %}
</figure>

</details>

Here, we can see that the ROSE inline mechanism has expanded each recursive call with temporary variables for each.


#### Template Functions ####
The input code below contains a template function `swap()` and a call to it. ROSE can handle C++ template functions as part of its inlining mechanism.

<figure class="lineno-container">
{% highlight c++ linenos %}
template<typename T>
 void swap(T& x, T& y)
 {
   T tmp = x;
   x = y;
   y = tmp;
 }

int foo (int a, int b)
{
   swap(a,b);
}

int main()
{
}
{% endhighlight %}
</figure>

Run the inliner:

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-inlining/template.cpp
./inlineEverything -c template.cpp
```

View the output:

```.term1
cat -n rose_template.cpp
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
1  template < typename T >
2   void swap ( T & x, T & y )
3   {
4     T tmp = x;
5     x = y;
6     y = tmp;
7   }
8
9  int foo(int a,int b)
10  {
11  {
12      int tmp = a;
13      a = b;
14      b = tmp;
15    }
16  }
17
18  int main()
19  {
20  }
{% endhighlight %}
</figure>

</details>

We have successfully inserted the definition of the template `swap()` function into the respective call site. Pre-processing has cleaned up the code well.

---

## Additional Resources ##
  * This tutorial is based on the [ROSE WikiBook tutorial on inlining](https://en.wikibooks.org/wiki/ROSE_Compiler_Framework/Inliner#Source_code). Some additional examples and explanation can be found there.
  * Many more demos of inlining can be found [here](https://github.com/chunhualiao/inliner-demo) from @chunhualiao.
  * Chapter 36 of the [ROSE Tutorial PDF](http://rosecompiler.org/uploads/ROSE-Tutorial.pdf) contains some additional examples of the inline mechanism.
  * The [Wikipedia](https://en.wikipedia.org/wiki/Inline_expansion) page on inlining contains additional explanations, especially for discussing the performance gain or loss of inlining.

  Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-17-rose-inlining.markdown)
