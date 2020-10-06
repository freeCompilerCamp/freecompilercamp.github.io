---
layout: exam
title: "Working with Map Clause Exam"
author: "@ouankou"
date: 2020-10-06
categories: exam
exam_name: map-clause
exam_language: c
tags: [rose, practical]
image: freecompilercamp/pwc:rose-exam
---

## Evaluate Your Understanding ##
This purpose of this exam is to evaluate your understanding of working with map clause with ROSE.

This is a "closed-book" test and the terminal has been removed. Write your code in the text editor and click the "Build" button to have the server compile your solution. Any errors will show in the console view. If the build is successful, click the "Run" button to have your submission graded.

### Task ###
Implement a ROSE translator that traverses the AST and counts the number of mapped variables for GPU offloading*. Please notice that besides the variables specifed in the map clause, other variables may also be involved.

Example input:

<figure class="lineno-container">
{% highlight cpp linenos %}
int main(int argc, char* argv[])
{
	int x = 1;
	int y = 0;

#pragma omp target map(to: x, y)
    x = 6;

	return 0;
}
{% endhighlight %}
</figure>

In this example, there are two mapped variables `x` and `y`.
