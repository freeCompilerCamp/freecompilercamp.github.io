---
layout: post
title:  "ROSE AST - Modification"
author: "@ouankou"
date:   2019-09-25
categories: beginner
tags: [rose,ast,modification]
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

## Features
This is a tutorial to build your own source code translator by modifying ROSE AST.

---

# A. Overview
A common task in compiler development is to modify the existing AST to conduct code transformation. ROSE includes different API functions from the SageBuilder and SageInterface namespaces for this purpose. A complete list of these functions can be viewed at DoxyGen docs of ROSE at http://rosecompiler.org/ROSE_HTML_Reference/index.html .

The goal of this tutorial is to learn how to use the ROSE AST transformation API to insert a function call and generate the output source code. 

# B. Get the source files 

Enter the build folder and check the sample program that inserts a dummy function call to the input.

For more details, we can check the source code for this sample program.

```.term1
cat /home/freecc/source/rose_src/tests/nonsmoke/functional/roseTests/astInterfaceTests/buildFunctionCalls.C
```

A C function call contains a return type, function name and one or more parameters. We'll build a new piece of AST for all of them. After creating a new subtree based on those information, we attach the subtree to the existing AST tree.
In the source file, line 35-44 are the essential code to insert the new function call. Line 36 claims the return type for the new function. Line 37-39 create its parameter list. Line 40 generates a statement of function call. Finally, line 44 inserts this function call right before the return statement in the main function.

```
...
35 // void foo(int p_sum)
36 SgType* return_type = buildVoidType();
37 SgVarRefExp* arg1 = buildVarRefExp(SgName("p_sum"));//type is inferred from symbol table
38 SgExprListExp* arg_list = buildExprListExp();
39 appendExpression(arg_list,arg1);
40 SgExprStatement* callStmt1 = buildFunctionCallStmt(SgName("foo"),return_type, arg_list);
41
42 // insert before the last return statement
43 SgStatement* lastStmt = getLastStatement(topScopeStack());
44 insertStatement(lastStmt,callStmt1);
...
```

Afer writing the source code for the translation tool, we'll prepare an input file for testing.
     
```.term1
wget https://raw.githubusercontent.com/passlab/rose/release/tests/nonsmoke/functional/roseTests/astInterfaceTests/inputbuildFunctionCalls.C
wget https://raw.githubusercontent.com/passlab/rose/release/tests/nonsmoke/functional/roseTests/astInterfaceTests/inputbuildFunctionCalls.h
```
We can check the sample input and confirm that there's no function call to ```foo()```.

```.term1
cat inputbuildFunctionCalls.C
```
Essentially, we can see the following content:

```
1  // goal 1. generate
2  //  foo(p_sum);
3  // goal 2. generate
4  //  foo(0.5);
5  //   after inserting its header
6 
7  // how parameter is used
8  void foo(int x);
9
10 int main (void)
11 {
12   int p_sum=0;
13   return p_sum;
14 }
```

# C. Run the translator tool

Build the tool: 
```.term1
cd /home/freecc/build/rose_build/tests/nonsmoke/functional/roseTests/astInterfaceTests/
make buildFunctionCalls
```

After building the tool, there is an executable file named ```buildFunctionCalls``` under the current directory:
```.term1
ls buildFunctionCalls
```

Finally, run the tool to insert the function call into the sample input code:

```.term1
./buildFunctionCalls -c inputbuildFunctionCalls.C
```
The generated source code still has the same name but wiht a prefix ```rose_```. It's unparsed from the updated AST.
Be checking the new source code, it clearly shows that ```foo()``` is called with parameter ```p_sum``` now.

```.term1
cat rose_inputbuildFunctionCalls.C
```

The line 13 and 14 verified that new function calls have been added to the AST.

```
...
10 int main()
11 {
12   int p_sum = 0;
13   foo(p_sum);
14   bar(0.500000);
15   return p_sum;
16 }
...
```


# References

For more information about AST modification, please check
* http://rosecompiler.org/uploads/ROSE-Tutorial.pdf Chapter 7
