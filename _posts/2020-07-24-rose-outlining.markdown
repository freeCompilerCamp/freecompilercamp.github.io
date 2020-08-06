---
layout: post
title: "Outlining Transformations"
author: "@vec4"
date: 2020-07-24
categories: intermediate
tags: [rose, outlining, program-transformation]
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
**Outlining** is the process of replacing a block of consecutive statements with a function call and is the inverse of inlining. Outlining is often used to generate kernel functions for CPU and/or GPU computation, help implement programming models such as OpenMP, and support empirical tuning of a code portion by first generating a function out of the portion.

In this tutorial, we will look at the outliner mechanism in ROSE.

## A. Outliner mechanism in ROSE ##
ROSE provides a builtin translator that can outline a specified portion of code and generate a function from it. There are two ways to perform outlining in ROSE:

  * "Low-level" method: call low-level outlining routines that directly operate on the AST nodes you want to outline.
  * "User-level" method: use a special pragma to mark outline targets in the input program, and then call a high-level driver routine to process these pragmas. You could also use the command line option to specify outlining targets using abstract handle strings (advanced - see Chapter 46 of ROSE tutorial)

Before discussing how to use the ROSE outline mechanism, it is important to note its limitations. ROSE can only outline single `SgStatement` nodes; note, however, that an `SgStatement` node may be a block (i.e., an `SgBasicBlock` node), allowing a "single statement" to comprise a sequence of complex statements. This is done to avoid subtly changing the program's semantics when outlining code.

Additionally, only some `SgStatement` nodes can be outlined. The outliner interface provides a `isOutlineable()` function for testing whether or not a given `SgStatement` object satisfies the preconditions. In general, the following is outlineable, although this is not a comprehensive list:

  * Specific `SgType` nodes,
  * No `SgVariableDeclaration` nodes,
  * Must be enclosed in a function declaration, excluding template instantiation (member) function declaration,
  * Does not refer to hidden types

ROSE places outlined functions, by default, at the end of the file to guarantee it has access to all of the same declarations that were available at the outline target site.

The high-level driver is a tool included with ROSE that can be installed via the commands below. We will use this driver in this tutorial.

```.term1
cd ${ROSE_BUILD}/tests/nonsmoke/functional/roseTests/astOutliningTests
make install outline
```

The tool will be installed to the `astOutliningTests` directory above and can be referenced with the `./outline` command. You can learn more about its parameters and operation modes via

```.term1
./outline --help | more
```

Generally, to use this tool, we insert some special pragmas (e.g., `#pragma rose_outline`) into our input code. We could also use abstract handles, as mentioned, but as this is an advanced technique, we will focus on the former in this tutorial. For example, we could call `./outline test.cpp` to outline code portions in the input file `test.cpp` that marked with the special `rose_outline` pragma.

If you want to use the "low-level" method in your own translators to leverage outlining support in ROSE, a programming API (`Outliner` namespace) is available and defined in the midend (`src/midend/programTransformation/astOutlining`). Relevant functions include `Outliner::outline()` and `Outliner::isOutlineable()`. See Chapter 37 of the [ROSE Tutorial PDF](http://rosecompiler.org/uploads/ROSE-Tutorial.pdf) for more details and examples. In this tutorial, we focus only on the user-level builtin translator.


## B. Example Input ##
In this section, we use the built-in outlining tool on various example inputs of increasing complexity. This will help us understand the capabilities of outlining in ROSE. You should have already built this tool from above.

#### Simple Example ####
Consider the following input code which determines the number of lucky integers in the digits of a given integer.

<figure class="lineno-container">
{% highlight c++ linenos %}
int main()
{
    double n, start=1, total;
    double unlucky=0, lucky;
    double *number;

    scanf("%lf",&n);                    
    total = 9;                      
    for(int j =1; j < n; j++)
    {
      total = total * 10;
      start = start *10;
    }

    number = (double*)malloc(n * sizeof(double));                           
    for(double i = start; i < start*10; i++)
    {
      double temp = i;
#pragma rose_outline
      for(int j = 1; j<= n; j++)
      {
	number[j]=(int)temp%10;
	temp = temp/10;
      }
      for(int k = n; k>=1; k--)
      {
	if(number[k] == 1 && number[k-1] == 3){
	  unlucky++;
	  break;
	}
      }
    }                                   
    lucky = total - unlucky;
    printf("there are %f lucky integers in %f digits integers", lucky, n);
    return 0;
}
{% endhighlight %}
</figure>

Notice the inclusion of the `#pragma rose_outline` on line 19, indicating that we would like to outline the following block (in this case, the following for loop on lines 20-24). We expect the outliner to take this block and create a function out of it, complete with any variables included in the block (`n`, `temp`, etc.) placed as function parameters.

Let's run the builtin outliner on this sample code with no additional configuration. The following commands obtain the input code and run the outliner on it.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-outlining/lucky.c
./outline lucky.c
```

We can view the output as below.

```.term1
cat -n rose_lucky.c
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
static void OUT__1__9096__(double *np__,double **numberp__,double *tempp__);

int main()
{
  double n;
  double start = 1;
  double total;
  double unlucky = 0;
  double lucky;
  double *number;
  scanf("%lf",&n);
  total = 9;
  for (int j = 1; j < n; j++) {
    total = total * 10;
    start = start * 10;
  }
  number = ((double *)(malloc(n * (sizeof(double )))));
  for (double i = start; i < start * 10; i++) {
    double temp = i;
    OUT__1__9096__(&n,&number,&temp);
    for (int k = n; k >= 1; k--) {
      if (number[k] == 1 && number[k - 1] == 3) {
        unlucky++;
        break;
      }
    }
  }
  lucky = total - unlucky;
  printf("there are %f lucky integers in %f digits integers",lucky,n);
  return 0;
}

static void OUT__1__9096__(double *np__,double **numberp__,double *tempp__)
{
  double *n = (double *)np__;
  double **number = (double **)numberp__;
  double *temp = (double *)tempp__;
  for (int j = 1; j <=  *n; j++) {
    ( *number)[j] = (((int )( *temp)) % 10);
     *temp =  *temp / 10;
  }
}
{% endhighlight %}
</figure>

</details>

As we can see, the ROSE outliner has successfully created a function corresponding to the for block on lines 20-24 of the input code and replaced this block with a call to that generated function. Notice the creation of various generated pointers (`*n`, `**number`, etc.) to ensure that the function performs the same operation as the original block. Additionally, we note that function parameters have also been properly added.

#### Pointer Type ####
This example shows the case of outlining when a `char*` type is present. Here we are outlining the block containing several statements dealing with the `char*` variable.

<figure class="lineno-container">
{% highlight c++ linenos %}
#include <stdio.h>
#include <stdlib.h>

const char *abc_soups[10] = {("minstrone"), ("french onion"), ("Texas chili"), ("clam chowder"), ("potato leek"), ("lentil"), ("white bean"), ("chicken noodle"), ("pho"), ("fish ball")};

int main (void)
{
// split variable declarations with their initializations, as a better demo for the outliner
  int abc_numBowls;
  const char *abc_soupName;
  int numBowls;
  const char *soupName;
#pragma rose_outline
  {
    abc_numBowls = rand () % 10;
    abc_soupName = abc_soups[rand () % 10];
    numBowls = abc_numBowls;
    soupName = abc_soupName;
  }

  printf ("Here are your %d bowls of %s soup\n", numBowls, soupName);

  printf ("-----------------------------------------------------\n");
  return 0;
}
{% endhighlight %}
</figure>

In this case, we will run the outliner with some additional parameters, as shown below. Of note are the `parameter_wrapper` and `detect_dangling_pointers` parameters. The former is used for an array of pointers to pack the variables to be passed. The latter is used for detecting leftover dangling pointers, as the name implies.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-outlining/soups.cpp
./outline --edg:no_warnings -rose:verbose 0 -rose:outline:parameter_wrapper -rose:detect_dangling_pointers 1 -c soups.cpp
```

We view the output below.

```.term1
cat -n rose_soups.cpp
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
#include <stdio.h>
#include <stdlib.h>
const char *abc_soups[10] = {("minstrone"), ("french onion"), ("Texas chili"), ("clam chowder"), ("potato leek"), ("lentil"), ("white bean"), ("chicken noodle"), ("pho"), ("fish ball")};
static void OUT__1__9338__(void **__out_argv);

int main()
{
// split variable declarations with their initializations, as a better demo for the outliner
  int abc_numBowls;
  const char *abc_soupName;
  int numBowls;
  const char *soupName;
  void *__out_argv1__9338__[4];
  __out_argv1__9338__[0] = ((void *)(&soupName));
  __out_argv1__9338__[1] = ((void *)(&numBowls));
  __out_argv1__9338__[2] = ((void *)(&abc_soupName));
  __out_argv1__9338__[3] = ((void *)(&abc_numBowls));
  OUT__1__9338__(__out_argv1__9338__);
  printf("Here are your %d bowls of %s soup\n",numBowls,soupName);
  printf("-----------------------------------------------------\n");
  return 0;
}

static void OUT__1__9338__(void **__out_argv)
{
  int &abc_numBowls =  *((int *)__out_argv[3]);
  const char *&abc_soupName =  *((const char **)__out_argv[2]);
  int &numBowls =  *((int *)__out_argv[1]);
  const char *&soupName =  *((const char **)__out_argv[0]);
  abc_numBowls = rand() % 10;
  abc_soupName = abc_soups[rand() % 10];
  numBowls = abc_numBowls;
  soupName = abc_soupName;
}
{% endhighlight %}
</figure>

</details>

ROSE has successfully performed outlining for this block containing pointers. Note that the variables to be passed to the function are packed into an array of pointers on lines 13-17, and unpacked in the function definition, as we expect due to our `parameter_wrapper` parameter to the outliner.

#### C++ Member Functions ####
In this example, we have a C++ member function as part of a class with a simple outline pragma. ROSE adds a friend declaration for the outlined function so it can access private class members and passes the `this` pointer to the class object as a function argument. We see that ROSE does a little extra processing for C++ class-based outlining.

<figure class="lineno-container">
{% highlight c++ linenos %}
int a;

class B
{
  private:

  int b;
 inline void foo(int c)
 {
#pragma rose_outline
   b = a+c;
 }
};
{% endhighlight %}
</figure>

Let's run the outliner on this input code.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-outlining/member-func.cpp
./outline member-func.cpp
```

The output is below.

```.term1
cat -n rose_member-func.cpp
```

<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
int a;
static void OUT__1__9873__(int *cp__,void *this__ptr__p__);

class B
{
  public: friend void ::OUT__1__9873__(int *cp__,void *this__ptr__p__);
  private: int b;


  inline void foo(int c)
{
// //A declaration for this pointer
    class B *this__ptr__ = this;
    OUT__1__9873__(&c,&this__ptr__);
  }
}
;

static void OUT__1__9873__(int *cp__,void *this__ptr__p__)
{
  int &c =  *((int *)cp__);
  class B *&this__ptr__ =  *((class B **)this__ptr__p__);
  this__ptr__ -> b = a + c;
}
{% endhighlight %}
</figure>

</details>

We see that ROSE has added the corresponding friend function and passes the `this` pointer and the outlining has been performed successfully.


---

## Additional Resources ##
  * This tutorial is based on the [ROSE WikiBook tutorial on outlining](https://en.wikibooks.org/wiki/ROSE_Compiler_Framework/outliner). Some additional examples and explanation, particularly about the outlining algorithm itself, can be found there.
  * Chapter 37 of the [ROSE Tutorial PDF](http://rosecompiler.org/uploads/ROSE-Tutorial.pdf) contains some additional examples of the outline mechanism, especially for the low-level method.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-24-rose-outlining.markdown)
