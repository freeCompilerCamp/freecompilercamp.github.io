---
layout: exam
title: "Working with Complex Types Exam"
author: "@vec4"
date: 2020-08-14
categories: exam
exam_name: complex-types
exam_language: c++
tags: [rose, practical]
image: freecompilercamp/pwc:rose-exam
---

## Evaluate Your Understanding ##
This purpose of this exam is to evaluate your understanding of working with complex types with ROSE.

This is a "closed-book" test and the terminal has been removed. Write your code in the text editor and click the "Build" button to have the server compile your solution. Any errors will show in the console view. If the build is successful, click the "Run" button to have your submission graded.

### Task ###
Implement a ROSE translator that traverses the AST and counts the number of `const` type-qualified variables *that are class member function parameters*.

Example input:

<figure class="lineno-container">
{% highlight cpp linenos %}
#include <string>

class A {
private:
    int data;
public:
    void func1(const std::string s) const;
    void func2(std::string s) const;

    void func3(const std::string s);
};
{% endhighlight %}
</figure>

In this example, there are two `const` type-qualified member function parameters.
