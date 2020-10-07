---
layout: exam
title: "Working with OpenMP Directives in the ROSE AST - Exam (Part 1)"
author: "@ouankou"
date: 2020-10-06
categories: exam
exam_name: map-clause
exam_language: c
tags: [rose, practical]
image: freecompilercamp/pwc:rose-exam
---

## Evaluate Your Understanding ##
The purpose of this exam is to evaluate your understanding of working with OpenMP directives with ROSE.

This is a "closed-book" test and the terminal has been removed. Write your code in the text editor and click the "Build" button to have the server compile your solution. Any errors will show in the console view. If the build is successful, click the "Run" button to have your submission graded.

### Task ###
Implement a ROSE translator that traverses the AST and counts the number of OpenMP mapped variables (OpenMP `map` clause) for GPU offloading. The `map` clause is used for GPU offloading in OpenMP and controls data movement between devices (e.g., between CPU and GPU). Counting how many variables are offloaded be useful in determining the extent of offloading in large-scale OpenMP programs.

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
