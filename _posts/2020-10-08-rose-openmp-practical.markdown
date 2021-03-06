---
layout: post
title: "Working with OpenMP Directives in the ROSE AST - Practical"
author: "@vec4"
date: 2020-10-08
categories: practical
tags: [rose, practical]
---

## Check Your Understanding ##
This purpose of this practical is to test your understanding of working with OpenMP types with ROSE. You will implement a simple tool that traverses the AST and looks for an OpenMP directive.

This is an "open-book" exercise and you may use the terminal and any resources. The [ROSE API](http://rosecompiler.org/ROSE_HTML_Reference/index.html) may be particularly useful.

### Task ###
Implement a ROSE translator that traverses the AST and counts the number of OpenMP `parallel for` directives. Run your translator with the following input code:

<figure class="lineno-container">
{% highlight c linenos %}
#include < stdio.h >
#include < omp.h >
#define N 1000000
int main(void) {
  float a[N], b[N], c[N], d[N];
  int i;
  int j;

  for (i = 0; i < N; i++) {
    a[i] = i * 2.0;
    b[i] = i * 3.0;
  }

  #pragma omp parallel shared(a, b, c) private(i)
  {
    #pragma omp for             
    for (i = 0; i < N; i++) {
      c[i] = a[i] + b[i];
    }
  }

  #pragma omp parallel for private(j)
  for (int j = 0; j < N; j++) {
    d[j] = a[i] * b[i];
  }
}
{% endhighlight %}
</figure>

Print the number of `parallel for` directives. The expected output is 2 for this test case.

#### Setting Up The Environment ####
Some starter code and a corresponding makefile is available for your usage. The following commands will obtain the skeleton source code for your translator `parallelForCounter` and save it to the `${ROSE_SRC}/practicals` directory. The corresponding makefile is also saved to `${ROSE_BUILD}/practicals`, as well as the input source code above as `parallelFor_input.c` in the same directory.

```.term1
mkdir ${ROSE_BUILD}/practicals && cd "$_"
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/practicals/openmp-traversal/Makefile
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/practicals/openmp-traversal/parallelFor_input.c
mkdir ${ROSE_SRC}/practicals && cd "$_"
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/practicals/openmp-traversal/parallelForCounter.C
```

Make your changes directly to the `parallelForCounter.C` source file and insert your code following the comment `"Insert your tool code here!"`. Vim, nano, and emacs are available within the terminal. When you are done, exit the text editor and return to the terminal.

#### Evaluation ####
To build your translator (without evaluation), run the following command.
```.term1
cd ${ROSE_BUILD}/practicals
make
```
Your translator should report no errors (it may report warnings, but those can generally be ignored) if implemented correctly and an executable file named `parallelForCounter` should appear in the working directory.

Once you are ready, you should now run your implementation with the input code, and check its output, via
```.term1
./parallelForCounter parallelFor_input.c
```
If your translator output a count of 2 `parallel for` directives, congratulations! You have completed the practical.
