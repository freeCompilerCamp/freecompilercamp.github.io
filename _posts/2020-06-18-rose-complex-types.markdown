---
layout: post
title: "Working with Complex Types"
author: "@vec4"
date: 2020-06-18
categories: beginner
tags: [rose]
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
In the previous tutorial, we saw how to traverse the AST to obtain the number of times a loop is encountered. In this tutorial, we will explore how to traverse the AST when more complex types exist in the input source code that we would like to obtain from the AST. We will take a look at some examples for various complex types, including type/declaration modifiers, function parameter extraction, resolving overloaded functions, and template parameter extraction.

---

## A. Type and Declaration Modifiers ##
Most languages support the general concept of modifiers to types, declarations, etc. The keyword *volatile* for example is a modifier to the type where it is used in a declaration. Searching for the modifiers for types and declarations, however, can be confusing. They are often not where one would expect, and most often because of corner cases in the language that force them to be handled in specific ways.

Here, we will look at some tutorial code to demonstrate how to access the *volatile* modifier used in the declaration of types for variables. We demonstrate that the modifier is not present in the `SgVariableDeclaration` or the `SgVariableDefinition`, but is located in the `SgModifierType` used to wrap the type returned from the `SgInitializedName` (the variable in the variable declaration).

#### Example ####
Let's take a look at the source code example for this section, showing use of the `volatile` type modifier.
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/complex-types/volatile_ex.cxx
cat -n volatile_ex.cxx
```
Notice we have three volatile variables: `a`, `b`, and `y`. `b` is actually a pointer to a volatile variable, rather than a volatile variable itself.

The source code of the ROSE traversal tool that looks for volatile modifiers can be viewed in Vim by
```.term1
vim ${ROSE_SRC}/tutorial/volatileTypeModifier.C
```

Here, we perform a standard AST traversal. In particular, we are looking for nodes of type `SgInitializedName` that represent the notion of a variable in a declaration. The general concept of a variable declaration is represented by `SgVariableDeclaration`. Similarly, variable definitions/initializations are represented by `SgVaraibleDefinition`. It is important to note that, in ROSE, each `SgVaraibleDeclaration` contains **only one** `SgInitializedName`. We can see this from an excerpt of the AST corresponding to the sample `volatile_ex.cxx` source, in particular the portion corresponding to the variable `a`:

![An excerpt of the AST corresponding to the sample input code above, for volatile variable a. Note that SgVariableDeclaration contains exactly one SgInitializedName in ROSE.](/images/SgInitializedName_Example.png)

The concept of type modifiers in ROSE is represented via the `SgModifierType` class, a subclass of `SgType`. The type modifier itself is represented by the `SgTypeModifier` class; we can obtain the latter from the former via the `get_typeModifier()` function. Although exposed through the API, it is important to note that type modifiers are **not** present in `SgVariableDeclaration` or `SgVariableDefinition` objects; they can only be reliably obtained via the `SgModifierType` returned from `SgInitializedName`.

Let us now discuss the source of the translator with these considerations in mind. For each IR node we visit, we check if it is of type `SgInitializedName` (lines 14-15). If we have a node of this type, we print its name (e.g., `a`) and get its type via the `get_type()` member function. Note that this returns the general `SgType` object, from which we must obtain the `SgModifierType` object on line 21. If we do indeed have a type modifier from this variable, we use a series of member functions to determine if it is volatile on line 24 using the `get_typeModifier()` function to return a `SgTypeModifier`. Note, in particular, that a type modifier can be const or volatile, hence the use of the `get_constVolatileModifier()` function followed by `isVolatile()`. Lines 28-38 can be ignored as the `SgModifierTypes` class is not currently used in ROSE.

Finally, lines 40-54 demonstrate that the volatile modifier type is *not* exposed in the `SgVariableDeclaration` nor `SgVariableDefinition` IR nodes, despite being exposed to the API. We expect this portion of the code to always print `false` for any IR nodes of these types encountered.

Let's run this traversal tool with our sample code above. Be sure to exit Vim first. First, we build it:
```.term1
cd ${ROSE_BUILD}/tutorial
make volatileTypeModifier
```
And then run it with our input source code:
```.term1
./volatileTypeModifier volatile_ex.cxx
```

From the output, we see that we have performed a successful AST traversal, and for each `SgVariableDeclaration`, `SgVariableDefinition`, and `SgInitializedName` IR nodes, we print some relevant information about volatile modifiers. As we expected, `isVolatile` is false for all `SgVariableDeclaration` and `SgVariableDefinition` nodes. For `SgInitializdName` nodes, we print the variable name, its type, whether or not it is volatile, and the modifier nodes. Note that `a` and `y` are volatile nodes. Although `b` is volatile-quantified, our tool does not realize this because the type of `b` is `SgPointerType`. This behavior is expected as `volatile int *b` is a pointer *to* a volatile variable, rather than a volatile pointer.

## B. Function Parameter Types ##
The analysis of functions often requires the query of the function types. This tutorial example shows how to obtain the function parameter types for any function. Note that functions also have a type which is based on their signature, a combination of their return type and function parameter types. Any functions sharing the same return type and function parameter types have the same function type (the function type, a `SgFunctionType` IR node, will be shared between such functions).

#### Examples ####

We will use the following code snippet for this section and those following.
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/complex-types/function_param_ex.cxx
cat -n function_param_ex.cxx
```
Notice that there is a lot going on in this source code - we have overloaded functions, template parameters, and a templated class. We will discuss how ROSE handles these cases in the following sections; for now, let us only focus on function parameter types.

Let's take a look at the source code of the `typeInfoFromFunctionParameter` translator, included with ROSE, that reads an application (our source code above) and outputs information about the function parameter types for each function. This information includes the order of the function declaration in the global scope, name of the function, and the types of each parameter declared in the function declaration. We can view this source code in Vim by
```.term1
vim ${ROSE_SRC}/tutorial/typeInfoFromFunctionParameters.C
```

In this translator, we do not explicitly traverse the AST as in previous examples; instead, we can use the alternate method of using the Query Library to search for nodes with a specific type. This is useful for simple translators, such as this one. To query the AST in this regard, we use the `NodeQuery` namespace to obtain a container of `SgNode`s corresponding to the type being searched for. `NodeQuery::querySubTree` takes as parameters the root `SgProject` node and the IR node type to search for. In our case, we are looking for `V_SgFunctionDeclaration`. Many SAGE classes/nodes in ROSE contain static variants, prefixed by `V_`, that can be used for queries. We perform this query in line 17 of the translator.

Once we have all the nodes of type `SgFunctionDeclaration`, we iterate through the container (line 20) and keep track of how many function declarations we have encountered so far. We then create a pointer to the current type so that we may use its member functions (lines 23-24). Note that there are a number of builtin functions defined as part of the g++ and gcc compatibility and these are output as well. These are marked as *compiler generated functions* within ROSE. We would like to differentiate between the two different types, and this is what the conditional on line 27 is doing. We continue so long as we are not working with a compiler generated function.

To obtain the parameters of the function, we simply call the `get_parameterList()` function on our `SgFunctionDeclaration` pointer obtained previously. We then print its name and increase the global function counter on line 33. We then obtain the initialized names of the function parameters by the `get_args()` function on the `SgFunctionParameterList` pointer, followed by iterating over each parameter and printing its type (lines 35-41). Finally, we print all the compiler generated functions on line 45. It is important to note that we iterate for each function found in the input source code, and for each function found, we print its parameter types.

Let's run this translator on the input code above. Build it by
```.term1
cd ${ROSE_BUILD}/tutorial
make typeInfoFromFunctionParameters
```

Run the translator on our `function_param_ex.cxx` input file by
```.term1
./typeInfoFromFunctionParameters function_param_ex.cxx
```

After 3,506 compiler generated functions, we see our own function declaration `foo` (and `main`). Note that the `foo` function is overloaded, but the translator has no issue identifying them as separate entities. In each case, we are able to print the parameter types.

## C. Resolving Overloaded Functions ##
In this section, we will look at a translator that reads an application (the same `function_param_ex.cxx` source code as above) and reposts on the mapping between function calls and function declarations. This is trivial since all overloaded function resolution is done within the frontend and so need not be computed (this is because all type resolution is done in the frontend and stored in the AST explicitly). Other compiler infrastructures often require this to be figured out from the AST, when type resolution is unavailable, and while not too hard for C, this is particularly complex for C++ (due to overloading and type promotion within function arguments).

#### Example ####
This translator is known as `resolveOverloadedFunction` and is available at
```.term1
vim ${ROSE_SRC}/tutorial/resolveOverloadedFunction.C
```

In this translator, we follow much of the same initial procedure to perform a subtree query as in the previous section. This time, however, we are interested in `SgFunctionCallExp` nodes, and so we use `V_SgFunctionCallExp` as the parameter to the subtree query. `SgFunctionCallExp` represents the *general* concept of a C++ function call and is an expression. Once we have it on lines 22-23, we obtain the actual expression using the `get_function()` member function. This object will let us perform a more detailed analysis of function expressions in the input source code.

`SgFunctionCallExp.get_function()` gives us the general concept of a specific function call, e.g., `foo()`. In C, and more so in C++, the left-hand side of a function call (e.g., `foo`) is itself an expression. This expression may be simple, such as in the case when a free-standing function is called directly; for example, by calling `foo()`. In this case, the left-hand side is an `SgFunctionRefExp`. Notice that we obtain this expression on line 29.

Of course, the left-hand side of a function call can be significantly more complicated and can be quite arbitrary. We could have a C++ call to a member function (e.g., `bar.foo()`), or have a family of function calls if the function is virtual. There could also be arbitrary expressions producing function pointers (e.g., `(******(foo))()`). For pointer-based structures or objects, member functions would also be accessed with the arrow operator (e.g., `bar->foo()`). As a result, it can often be tricky to analyze left-hand sides of function call expressions. Fortunately, ROSE provides a library function that takes in a call expression and fills a vector with a set of function declarations that could be called (see Section F for more details). There are also some expression-based classes that allow us to extract the left-hand side easier; e.g., `SgDotExp` representing the dot operator.

In our example here, we will keep things simple and look into the case where the left-hand side is either a free-standing function or is a member function accessed via the dot operator. In the latter case, the `SgFunctionRefExp` object obtained previously will be `NULL`, as the left-hand side is more complicated than a simple free-standing function. Otherwise, we can obtain the left-hand side by simply extracting the `SgFunctionSymbol`, which represents the function name, via the `get_symbol()` function of the `SgFunctionRefExp` (lines 32-36). For member functions, we need to obtain the expression from the right-hand side of the dot operator (line 41). Note, however, that the returned expression here will no longer be of type `SgFunctionRefExp`, as discussed previously. Instead, it is an object of class `SgMemberFunctionRefExp`. Once we have this object, we can obtain the symbol through the same `get_symbol()` function as previously (lines 42-45).

Finally, on lines 52-60, we obtain the final function declaration through a `SgFunctionDeclaration` object. We need the symbol to do this; this object also gives us information about the function declaration in the input source code, such as its location. Lines 56-59 print this information; notice that we are able to resolve overloaded functions using this methodology through the use of `SgFunctionSymbol`. That is, despite having overloaded function calls, we are able to distinguish between them.  

Let's build this translator by
```.term1
cd ${ROSE_BUILD}/tutorial
make resolveOverloadedFunction
```

Run the translator on `function_param_ex.cxx`:
```.term1
./resolveOverloadedFunction function_param_ex.cxx
```

The output shows each function call of `foo` being resolved by an overloaded function, even those inside the instantiated class. It may appear curious that the source location for the last three calls of `foo` are output as 0. Looking at the input code, we see that the first call `foo(42)` at line 28 is resolved by the overloaded function at line 13, as output by the translator. The second call `foo(3.14159265)` at line 29 is resolved by the overloaded function definition at line 14. The translator, however, outputs that the resolved overloaded function is at line 0; this is because, for consistency purposes, the ROSE compiler requires a function to be declared *separately* before it is defined. In the case where the first function declaration is also a function definition, as is the scenario here, ROSE generates a *hidden* first non-defining declaration, hence the output of 0. Similarly, the last two calls of `foo` on lines 32 and 33 are template functions, which are instantiated by the compiler, and therefore not technically part of the source code, leading to the output of 0 for the source location of these two calls as well.

## D. Template Parameter Extraction ##
In this tutorial, we will look at a translator that reads an application (a modified version of the previous input) and outputs some information about each instantiated template, including the template arguments. As a brief note, ROSE provides special handling for C++ templates because template instantiation must be controlled by the compiler. Templates that require instantiation are instantiated by ROSE and can be seen in the traversal of the AST (and transformed). Any templates that can be instantiated by the backend compiler **and** *are not transformed* are not output within the code generation phase.

#### Example ####
For this section, we will consider some templated example source code, which a slightly modified version of the previous two sections' input:
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/complex-types/template_param_ex.cxx
cat -n template_param_ex.cxx
```
Notice that this code contains a templated class, and we make several instantiations of that class. In this example, we will look into extracting the template parameters from these instantiated objects.
The translator of interest for this section is `templateParameter`:
```.term1
vim ${ROSE_SRC}/tutorial/templateParameter.C
```

Once again, we perform an AST subtree query, searching for `SgTemplateInstantiationDecl` nodes, as this contains all template instantiation declarations in our code. We again keep a global count of template classes and iterate over each declaration (lines 20-21). For each declaration, we obtain a pointer to the `SgTemplateInstanationDecl` object, as usual, and output the template name using `get_templateName()`. To obtain the parameter list, we use the `get_templateArguments()` function, much like we did for function parameter extraction (line 32). We then iterate through each parameter and print the template argument type. This translator is very similar to the function parameter extraction translator in Section B; however, it showcases working with template parameters instead. This can be trickier due to the ability to nest template parameters.

Let's build and run this tool with the example code above:
```.term1
cd ${ROSE_BUILD}/tutorial
make templateParameter
./templateParameter template_param_ex.cxx
```

The output shows each template class instantiation that appears in the input source code. Our first instantiation, on line 16, has template parameter `char`, as shown in the output of the translator. We have three more instantiations on lines 20-22, including one with a nested `char` parameter. However, the translator has no issue indicating that the argument here is of type `templatedClass<char>`.

## E. Summary ##
In this chapter, we have gotten familiar with working with various complex types in ROSE. We learned about traversing the AST and searching for nodes of interest, both with a traversal and with a query. We looked at examples involving type and declaration modifiers, function and template parameter extraction, and overloaded function resolution. There are many other types that can be searched with the AST in ROSE. We recommend looking into the ROSE API to learn more.

## F. Additional Resources ##
* ROSE provides a library function that takes in a call expression and fills a vector with a set of function declarations that could be called. If a callee cannot be determined exactly (as in the case with a function pointer), the set of functions returned is an overapproximation. The [CallGraph.h](http://rosecompiler.org/ROSE_HTML_Reference/CallGraph_8h_source.html) header contains this function `CallTargetSet::getPropertiesForExpression`.
* The [ROSE HTML reference page](http://rosecompiler.org/ROSE_HTML_Reference/index.html) contains a full doxygenerated API that may be helpful in writing your own tools that search for specific types in the AST. Classes referenced in this tutorial can also be viewed here for more information.
* The [ROSE User manual](http://rosecompiler.org/uploads/ROSE-UserManual.pdf) contains some more information about AST queries in Chapter 6.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-06-18-rose-complex-types.markdown)
