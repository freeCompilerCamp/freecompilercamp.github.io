---
layout: post
title: "Advanced AST Construction"
author: "@vec4"
date: 2020-07-09
categories: intermediate
tags: [rose,dataflow]
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
In a previous tutorial, we looked at a simple example of modifying the AST for some given source code in ROSE by adding a function call into the AST. In this tutorial, we will work with some more additional and more advanced AST modifications for supporting various source-to-source transformations. We particularly focus on common language constructs, such as variable declarations, functions, etc., and how to insert them into an existing AST. Note that AST modifications are most often done using high level interfaces for their simplicity, although low level interfaces can also be used to give users the maximum possible freedom for AST manipulation. In this tutorial, we rely on the high-level SAGE interface as the low-level interface is being phased out.

AST construction is generally done by using such an interface to construct a subtree for a particular modification before inserting it into the existing AST.

## A. Variable Declarations ##
In this section, we show an example of how to construct a SAGE III AST subtree for a variable declaration and its insertion into the existing tree at the top of each block. We use the high-level `SageBuilder` and `SageInterface` namespaces.

Let's take a look at the source code for the translator.

```.term1
cat -n ${ROSE_SRC}/tutorial/addVariableDeclaration2.C
```

Note that inclusion of the two `SageBuilder` and `SageInterface` namespaces. These give us access to high-level `buildXXX()` functions for easy subtree construction, as well as utility functions for AST manipulation.

Of interest is the `SimpleInstrumentation::visit()` function; the other components of the code are the usual AST traversal routines. Within our traversal, we look for `SgBasicBlocks` that represent code blocks. We then create an AST fragment (a variable declaration) on line 21. We use the `buildVariableDeclaration()` builder function from the `SageBuilder` namespace. This function takes as parameter the name and type to build a variable declaration node.

From there, we insert this fragment into the AST at the top of *each block*. We use the `prependStatement()` function from `SageInterface`, which inserts the declaration at the top of a basic block node. Details for parent and scope pointers, symbol tables, source file position information and so on are handled transparently by this high-level interface.

Let's build this translator:

```.term1
cd ${ROSE_BUILD}/tutorial
make addVariableDeclaration2
```

Then, we will run this translator on the simple input code below.

<figure class="lineno-container">
{% highlight cpp linenos %}
int main() {
  for (int i = 0; i < 4; i++) {
    int x;
  }

  return 0;
}
{% endhighlight %}
</figure>

You can obtain this code and run the translator on it via the commands below. We expect that there will be two insertions of a variable declaration `newVariable` of type integer for the two blocks (`main()` and the `for` loop) in the input code.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-advanced-ast-modification/variableDecl_input.cxx
./addVariableDeclaration2 variableDecl_input.cxx
```

We can then view the ROSE-generated output; i.e., our modified source code, via

```.term1
cat -n rose_variableDecl_input.cxx
```

Indeed, the output of the code shows that we have successfully inserted the variable declaration into the source code at the beginning of each block.

## B. Expressions ##
The previous example in Section A was relatively simple as we only inserted a variable declaration. In this example, we will insert a full expression by adding an assignment statement right before the last statement in the `main()` function. This is a little more involved as various components are required in order to build the expression.

Let's take a look at the source code for this translator.

```.term1
cat -n ${ROSE_SRC}/tutorial/addExpression.C
```

The goal here is to build two expressions:

```cpp
double result = 2.0 * (1.0 - gama * gama);
double result2 = alpha * beta;
```

before the last statement in `main()`. Because we know we are only interested in the `main()` function, we do not explicitly have to perform an AST traversal and can instead use `findMain()` as in line 16. From there, we can get the body of the `main()` function as in line 18-19.

Building these two expressions involves using various `buildXXX()` functions to build up the full expression. For example, on line 24 you can see we use the `buildMultiplyOp()` function to create the multiplication operator in the expression. This can be done in either a bottomup fashion (recommended), as in the case for our first expression, or a topdown fashion, as in the case for our second expression.

Bottomup builds the expression by operands first, and then the expression later. Most of these operand building functions are self-explanatory as can be seen in the translator code on lines 23-27, but note that `buildVarRefExp()` allows us to build a variable reference from an initialized name (in this case, `gama` already exists in our input code). Topdown builds the expression first, and sets the operands later. In this case, create the multiplication expression on line 35 and then use the `setRhsOperand()` and `setLhsOperand()` functions to set the operands.

Let's build this translator.

```.term1
cd ${ROSE_BUILD}/tutorial
make addExpression
```

We will run this translator with the input code below.

<figure class="lineno-container">
{% highlight cpp linenos %}
int main() {
  double alpha = 0.5;
  double beta = 0.1;
  double gama = 0.7;

  return 0;
}
{% endhighlight %}
</figure>

Use commands below to obtain the code and run our translator through it. We expect our two expressions to be inserted at the end of the `main()` function, but before the return.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-advanced-ast-modification/expression_input.cxx
./addExpression expression_input.cxx
```

We can view the output by

```.term1
cat -n rose_expression_input.cxx
```

Note that our two expressions have been correctly added in the proper location of the input source code.

## C. Functions ##
As our final example, we will take a look at a translator that shows how to add a function at the top of a global scope in a file.

The source can be viewed with the command below.

```.term1
cat -n ${ROSE_SRC}/tutorial/addFunctionDeclaration2.C
```

Just like before, we need to build up the function definition with various `buildXXX()` function calls. First, we construct the parameter list on lines 20-27. Here, our function has a single reference parameter: `int &var_name`. The code is quite self-explanatory, but do note that we must create an `SgInitializedName` for the variable and create the parameter list with `buildFunctionParameterList()`.

Next, we create a function declaration (lines 29-35). Again, the code is self-explanatory; take note, however, that we provide the return type (`int`) of the function in the `buildDefiningFunction()` function and provide it the parameter list. We also specify that this function is of global scope. Note, also, that we obtain a pointer to the function body which will allow us to add statements to the body.

The final step is to add statements to the function body (lines 37-50). In this case, we are adding the statement

```c++
++var_name;
```

We again use the `buildVarRefExp()` function to obtain the initialized name corresponding to the `var_name` variable. Once we have done this, we use `buildPlusPlusOp()` to build the `++var_name` expression, followed by building the statement containing the expression on line 43. Finally, lines 46-47 insert the statement into the body.

The resulting function we have constructed is below.

```c++
int my_function(int &var_name) {
  ++var_name;
}
```

Let's build our tool.

```.term1
cd ${ROSE_BUILD}/tutorial
make addFunctionDeclaration2
```

We will run our translator with the following input code.

<figure class="lineno-container">
{% highlight cpp linenos %}
int main() {
  for (int i = 0; i < 4; i++) {
    int x;
  }

  return 0;
}
{% endhighlight %}
</figure>

We expect that the function we have constructed will be inserted to the top of this source code (the global scope). Let's verify this:

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-advanced-ast-modification/function_input.cxx
./addFunctionDeclaration2 function_input.cxx
cat -n rose_function_input.cxx
```

The translator works as expected.

## Additional Resources ##
  * The introductory ["Modifying the ROSE AST"](http://freecompilercamp.org/rose-ast-modification/) tutorial provides an example of modifying the AST to insert function calls.
  * More examples of constructing the AST using high-level interfaces can be found at `rose/tests/nonsmoke/functional/roseTests/astInterfaceTests`.
  * The source files of the high level interfaces are located in `rose/src/frontend/SageIII/sageInterface`.
  * [API reference for `SageBuilder`](http://rosecompiler.org/ROSE_HTML_Reference/namespaceSageBuilder.html).
  * [API reference for `SageInterface`](http://rosecompiler.org/ROSE_HTML_Reference/namespaceSageInterface.html).

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-09-rose-advanced-ast-modification.markdown)
