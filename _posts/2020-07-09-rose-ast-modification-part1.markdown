---
layout: post
title: "AST Modification - Declarations and Expressions"
author: "@vec4"
date: 2020-07-09
categories: intermediate
tags: [rose, ast-modification]
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
Thus far, we've looked at how to work with the AST in ROSE, but we have not yet made any explicit changes to the AST. In this two-part tutorial, we will look at how to modify the AST to support various source-to-source transformations. We particularly focus on common language constructs, such as variable declarations, functions, etc., and how to insert them into an existing AST. Note that AST modifications are most often done using high level interfaces for their simplicity, although low level interfaces can also be used to give users the maximum possible freedom for AST manipulation. In this tutorial, we rely on the high-level SAGE interface as the low-level interface is being phased out.

AST construction is generally done by using such an interface to construct a subtree for a particular modification before inserting it into the existing AST.

## A. Variable Declarations ##
In this section, we show an example of how to construct a SAGE III AST subtree for a variable declaration and its insertion into the existing tree at the top of each block. We use the high-level `SageBuilder` and `SageInterface` namespaces.

Let's take a look at the source code for the translator.

```.term1
cd ${ROSE_SRC}/tutorial && rm addVariableDeclaration2.C
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-ast-modification/addVariableDeclaration2.C
cat -n ${ROSE_SRC}/tutorial/addVariableDeclaration2.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// SageBuilder contains all high level buildXXX() functions,
// such as buildVariableDeclaration(), buildLabelStatement() etc.
// SageInterface contains high level AST manipulation and utility functions,
// e.g. appendStatement(), lookupFunctionSymbolInParentScopes() etc.
#include "rose.h"
using namespace SageBuilder;
using namespace SageInterface;

class SimpleInstrumentation:public SgSimpleProcessing
{
public:
  void visit (SgNode * astNode);
};

void
SimpleInstrumentation::visit (SgNode * astNode)
{
  SgBasicBlock *block = isSgBasicBlock (astNode);
  if (block != NULL)
    {
      SgVariableDeclaration *variableDeclaration =
                buildVariableDeclaration ("newVariable", buildIntType (), NULL, block);
      prependStatement (variableDeclaration, block);
    }
}

int
main (int argc, char *argv[])
{
  // Initialize and check compatibility. See Rose::initialize
  ROSE_INITIALIZE;

  SgProject *project = frontend (argc, argv);
  ROSE_ASSERT (project != NULL);

  SimpleInstrumentation treeTraversal;
  treeTraversal.traverseInputFiles (project, preorder);

  AstTests::runAllTests (project);
  return backend (project);
}
{% endhighlight %}
</figure>

</details>

Note that inclusion of the two `SageBuilder` and `SageInterface` namespaces. These give us access to high-level `buildXXX()` functions for easy subtree construction, as well as utility functions for AST manipulation.

Of interest is the `SimpleInstrumentation::visit()` function, shown below; the other components of the code are the usual AST traversal routines.

<figure class="customlines-container">
{% highlight c++ %}
15  void
16  SimpleInstrumentation::visit (SgNode * astNode)
17  {
18    SgBasicBlock *block = isSgBasicBlock (astNode);
19    if (block != NULL)
20      {
21        SgVariableDeclaration *variableDeclaration =
22                  buildVariableDeclaration ("newVariable", buildIntType (), NULL, block);
23        prependStatement (variableDeclaration, block);
24      }
25  }
{% endhighlight %}
</figure>

Within our traversal, we look for `SgBasicBlock`s that represent code blocks. We then create an AST fragment (a variable declaration) on line 21. We use the `buildVariableDeclaration()` builder function from the `SageBuilder` namespace. This function takes as parameter the name and type to build a variable declaration node. Additionally, many builder functions, especially those for statements, take an optional initializer (`NULL` here since we are not initializing the declaration) and an optional scope parameter that describes the insertion's placement with respect to the scope, allowing declarations to have a local context. By default, the stack scope is used. An alternative method of specifying the scope is to use scope stack interfaces as we will see in Section B. See the [API reference](http://rosecompiler.org/ROSE_HTML_Reference/classSgScopeStatement.html) for SgScopeStatement for more details.

Although the scope parameter optional, the recommended practice is to always pass the scope parameter explicitly to reduce mistakes and promote good programming style. We follow this practice in these tutorials where useful. In this example, we use the `SgBasicBlock` as the explicit scope parameter using the same object obtained from the AST traversal, since we want to insert a declaration at the top of each block and thus have this scope. Because we specified block scope, this means that each declaration of `newVariable` have separate scopes, as we expect.

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

<details class="code-collapsible">
<summary>Click here to view output source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}

int main()
{
  int newVariable;
  for (int i = 0; i < 4; i++) {
    int newVariable;
    int x;
  }
  return 0;
}
{% endhighlight %}
</figure>

</details>

Indeed, the output of the code shows that we have successfully inserted the variable declaration into the source code at the beginning of each block.

## B. Expressions ##
The previous example in Section A was relatively simple as we only inserted a variable declaration. In this example, we will insert a full expression by adding an assignment statement right before the last statement in the `main()` function. This is a little more involved as various components are required in order to build the expression.

Let's take a look at the source code for this translator.

```.term1
cat -n ${ROSE_SRC}/tutorial/addExpression.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// Expressions can be built using both bottomup (recommended ) and topdownorders.
// Bottomup: build operands first, operation later
// Topdown: build operation first, set operands later on.

#include "rose.h"
using namespace SageBuilder;
using namespace SageInterface;

int main (int argc, char *argv[])
{
  // Initialize and check compatibility. See Rose::initialize
  ROSE_INITIALIZE;

  SgProject *project = frontend (argc, argv);
  // go to the function body
  SgFunctionDeclaration* mainFunc= findMain(project);

  SgBasicBlock* body= mainFunc->get_definition()->get_body();
  pushScopeStack(body);

 // bottomup: build operands first, create expression later on
 //  double result = 2 * (1 - gama * gama);
  SgExpression * init_exp =
            buildMultiplyOp(buildDoubleVal(2.0),
                 buildSubtractOp(buildDoubleVal(1.0),
                      buildMultiplyOp (buildVarRefExp("gama"),buildVarRefExp("gama")
                                      )));
  SgVariableDeclaration* decl = buildVariableDeclaration("result",buildDoubleType(),buildAssignInitializer(init_exp));

  SgStatement* laststmt = getLastStatement(topScopeStack());
  insertStatementBefore(laststmt,decl);

 // topdown: build expression first, set operands later on
 // double result2 = alpha * beta;
  SgExpression * init_exp2 = buildMultiplyOp();
  setLhsOperand(init_exp2,buildVarRefExp("alpha"));
  setRhsOperand(init_exp2,buildVarRefExp("beta"));

  SgVariableDeclaration* decl2 = buildVariableDeclaration("result2",buildDoubleType(),buildAssignInitializer(init_exp2));
  laststmt = getLastStatement(topScopeStack());
  insertStatementBefore(laststmt,decl2);

  popScopeStack();
  AstTests::runAllTests(project);

  //invoke backend compiler to generate object/binary files
   return backend (project);

}
{% endhighlight %}
</figure>

</details>

The goal here is to build two expressions:

```c++
double result = 2.0 * (1.0 - gama * gama);
double result2 = alpha * beta;
```

before the last statement in `main()`. Because we know we are only interested in the `main()` function, we do not explicitly have to perform an AST traversal and can instead use `findMain()` as in line 16. From there, we can get the body of the `main()` function as in line 18-19. Note that we use the alternative method of using scope stack interfaces (i.e., `pushScopeStack` and `popScopeStack()`) instead of passing the scope to each builder function.

Building these two expressions involves using various `buildXXX()` functions to build up the full expression. For example, on line 24 you can see we use the `buildMultiplyOp()` function to create the multiplication operator in the expression. This can be done in either a bottomup fashion (recommended), as in the case for our first expression, or a topdown fashion, as in the case for our second expression. Let's view lines 21-31, corresponding to a bottomup build:

<figure class="customlines-container">
{% highlight c++ %}
21  // bottomup: build operands first, create expression later on
22  //  double result = 2 * (1 - gama * gama);
23  SgExpression * init_exp =
24    buildMultiplyOp(buildDoubleVal(2.0),
25    buildSubtractOp(buildDoubleVal(1.0),
26    buildMultiplyOp (buildVarRefExp("gama"),buildVarRefExp("gama")
27      )));
28  SgVariableDeclaration* decl = buildVariableDeclaration("result",buildDoubleType(),buildAssignInitializer(init_exp));
29
30  SgStatement* laststmt = getLastStatement(topScopeStack());
31  insertStatementBefore(laststmt,decl);
{% endhighlight %}
</figure>

Bottomup builds the expression by operands first, and then the expression later. Most of these operand building functions are self-explanatory as can be seen in the translator code on lines 23-27, but note that `buildVarRefExp()` allows us to build a variable reference from an initialized name (in this case, `gama` already exists in our input code). Next, let's view lines 33-41 for the topdown build:

<figure class="customlines-container">
{% highlight c++ %}
33  // topdown: build expression first, set operands later on
34  // double result2 = alpha * beta;
35  SgExpression * init_exp2 = buildMultiplyOp();
36  setLhsOperand(init_exp2,buildVarRefExp("alpha"));
37  setRhsOperand(init_exp2,buildVarRefExp("beta"));
38
39  SgVariableDeclaration* decl2 = buildVariableDeclaration("result2",buildDoubleType(),buildAssignInitializer(init_exp2));
40  laststmt = getLastStatement(topScopeStack());
41  insertStatementBefore(laststmt,decl2);
{% endhighlight %}
</figure>

Topdown builds the expression first, and sets the operands later. In this case, we create the multiplication expression on line 35 and then use the `setRhsOperand()` and `setLhsOperand()` functions to set the operands.

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

<details class="code-collapsible">
<summary>Click to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}

int main()
{
  double alpha = 0.5;
  double beta = 0.1;
  double gama = 0.7;
  double result = 2.00000 * (1.00000 - gama * gama);
  double result2 = alpha * beta;
  return 0;
}
{% endhighlight %}
</figure>

</details>

Note that our two expressions have been correctly added in the proper location of the input source code.

### Next Step... ###
When you are ready, click [here](/rose-ast-modification-part2) to continue to part two of this tutorial.

## Additional Resources ##
  * More examples of constructing the AST using high-level interfaces can be found at `rose/tests/nonsmoke/functional/roseTests/astInterfaceTests`.
  * The source files of the high level interfaces are located in `rose/src/frontend/SageIII/sageInterface`.
  * [API reference for `SageBuilder`](http://rosecompiler.org/ROSE_HTML_Reference/namespaceSageBuilder.html).
  * [API reference for `SageInterface`](http://rosecompiler.org/ROSE_HTML_Reference/namespaceSageInterface.html).

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-09-rose-ast-modification-part1.markdown)
