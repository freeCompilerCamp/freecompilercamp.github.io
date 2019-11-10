---
layout: post
title:  "How to add a new OpenMP directive in Rose compiler"
author: "@alokmishra.besu"
date:   2019-06-27
categories: beginner
tags: [rose,openmp,directive]
---

# Tips:

Code snippets are shown in one of three ways throughout this environment:

1. Code that looks like `this` is sample code snippets that is usually part of an explanation.
2. Code that appears in box like the one below can be clicked on and it will automatically be typed in to the appropriate terminal window:
```.term1
vim readme.txt
```

3. Code appearing in windows like the one below is code that you should type in yourself. Usually there will be a unique ID or other bit your need to enter which we cannot supply. Items appearing in <> are the pieces you should substitute based on the instructions.
```
Add your name here - <name>
```

### Features

In this tutorial we will cover how to add a new OpenMP directive in Rose compiler

---

## Step 1
First, let's enter the ```ROSE``` source folder to look around. There are bunch of files there. For now only two of them will be modified for our goal. Both files are in the path src/frontend/SageIII
```.term1
cd $ROSE_SRC/src/frontend/SageIII
```

## Step 2
Then, the lexer needs to recognize the input "hello" and convert it to a token ```HELLO```. The token will be required by the parser later. We'll open the lexer file and add a simple line to do that.
```.term1
vim omplexer.ll
```
The line below should be added into the block of lexering rules. The order of rules matter. For now we don't need to care much details about that. Please copy and paste the content below line 67. After editing, press ```esc```, input ```:wq``` and press ```enter``` to save and quit the editor.
```
hello {printf("HELLO is caught.\n"); return HELLO;}
```

## Step 3
To use the token, we also need to declare it in the parser file ```ompparser.yy```.
```.term1
vim ompparser.yy
```
Add the following code below line 116 in the block of token declaration.
```
%token HELLO
```
Again, we need to press ```esc```, input ```:wq``` and press ```enter``` to save and quit the editor.

## Step 4
That's it! All necessary changes are made. Let's compile and ROSE with these changes.
```.term1
cd $ROSE_BUILD && make core -s && make install-core
```
This will build and install the ROSE compile. Now to test we can go to our examples directory and test our compiler
```.term1
cd $EXAMPLE_DIR && cat test.c 
```
```.term1
rose-compiler -rose:openmp:ast_only test.c
```
Now you can see the new keyword ```hello``` is recognized by the lexer. Good job!
