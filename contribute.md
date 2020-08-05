Adding a tutorial involves two web pages.
* One is a newly created tutorial page written in Markdown.  
* The other is the landing page also written in Markdown, in which you need to add a link to the page of the new tutorial.
  * For Clang/LLVM tutorials, the landing page is ./_posts/2019-11-06-clang-llvm-landing.markdown
  * For ROSE tutorials, the landing page is ./_posts/2019-11-06-rose-landing.markdown

After editing these two files, you can start a pull request. The changes will be made effective once the request is merged, using this Github Pages repo.

## 1. Tutorial Page
Take the autoPar tutorial as an example.
https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-07-01-rose-autopar.markdown

You can create a new similar Markdown file named ```2019-07-01-rose-your-tutorial.markdown``` and put it in the folder ```./_posts```. Please note that the file must follow the date-tutorial-name.markdown convention to be linked to a parent web page later.

#### a. Update headers

Add title, author, date and so on.
The docker image used for sandbox could be specified here. Currently, we provide the following images.
- `freecompilercamp/pwc:full`: it contains both LLVM 10 and ROSE. If no image is specified by user, this one is used by default.
- `freecompilercamp/pwc:llvm10`: it contains only LLVM 10.
- `freecompilercamp/pwc:rose`: it contains only a release version of ROSE.
- `freecompilercamp/pwc:rose-debug`: it contains a debug build of ROSE, `-O0` is used by default.
- `freecompilercamp/pwc:rose-bug`: it contains an old version of ROSE that has a loop stride bug.
- `freecompilercamp/pwc:16.04`: it's a legacy sandbox with the old version of ROSE and LLVM 8.x based on Ubuntu 16.04.

For example, to specify to use the image of ROSE in the tutorial above, add the following line to the header of [tutorial markdown file](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-07-01-rose-autopar.markdown
).
```
image: freecompilercamp/pwc:rose
```

#### b. Add content

Write freely in Markdown.

Some special syntax:
* For the code only for browsing, use a pair of triple backticks \`\`\` to include them. You can style your syntax based on various languages by placing the language name immediately after the first three backticks. A list of supported languages can be found [here](https://github.com/rouge-ruby/rouge/wiki/List-of-supported-languages-and-lexers).
* For the code clickable and executed in the sandbox, use ```.term1``` as code snippet type (after the first three backticks).
* For more advanced styling (e.g., code with line numbers, collapsible code snippets, etc.), see the [styling guide](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/styling-guide.md).

For example,  in the following example, ```echo HELLO``` contained in ```.term1``` code snippet will print ``HELLO`` in the sandbox terminal.

There are some built-in environment variables to faciliate the creation of command lines:
* For ROSE: `$ROSE_BUILD`, `$ROSE_SRC$`, `$ROSE_PATH`,
* For Clang/LLVM: `$LLVM_PATH`, `$LLVM_BUILD`, `$LLVM_SRC`

Sometimes you want to insert a figure into your tutorial. You need to
* First create the figure and save it into a png file
* Upload the png file to top_dir/compiler-classroom/images
* Inside of your tutorial, add a link to the figure:
```
![Your wonderful figure caption here](/images/your_figure_name.png)
```

#### c. Update sandbox docker image (optionally)

Currently in the sandbox terminal, basic development tools have been installed, such as ```gcc```, ```rose```, ```llvm``` and ```vim```. If any other tool is required for your tutorials, you can either ask the visitors to install them as part of your tutorials. Or you can add them in the docker image.

To customize the sandbox, please check [Deploy FreeCC to AWS](https://github.com/chunhualiao/freeCompilerCamp/wiki/Deploy-FreeCC-to-AWS).

## 2. Landing Pages

Again, we have two landing pages
* One for Clang/LLVM tutorials: https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-11-06-clang-llvm-landing.markdown
* The other for ROSE tutorials: https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-11-06-rose-landing.markdown

For example, to add a new tutorial for ROSE, go to the ROSE's landing page and insert a link to your tutorial page. The targeted link is the file name mentioned above without date and extension. For example, the address to ```2019-07-01-rose-autopar.markdown``` is ```/rose-autopar```. A proper title should be provided as well.

The modified section is shown as follows.
```markdown
[Trying autoPar - Auto Parallelization Tool in ROSE](/rose-autopar)
  * This is a tool which can automatically insert OpenMP pragmas into input serial C/C++ codes.

[Fixing a Bug in OpenMP Implementation](/rose-fix-bug-in-omp)
  * This tutorial is to show how to fix OpenMP implementation bugs in ROSE compiler.
```

## Best Practices for Writing Tutorials
Here are some practices we recommend following when writing your own tutorials, based on our own experience.
  * Try to keep the length of the tutorial to around 10-15 minutes for the average user. You may consider having a colleague review your tutorial before submitting the pull request.
  * Use code snippets to discuss the relevant parts of a tool's source code.
  * Ensure that your tutorial does not solely rely on the terminal. Some users may choose to only read the tutorial and not use or are not able to use the terminal. This can usually be achieved by including the result of any `cat` or other output commands as a code snippet in the tutorial text ([collapsible](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/styling-guide.md#collapsible-code-snippets) preferred). The intention is that someone could go through the tutorial and view relevant code snippets without ever touching the terminal, where feasible.
  * Use clickable terminal commands whenever you want the user to issue some command in the terminal. This avoids users from having to manually type commands in.
  * We generally provide input code via a separate GitHub repository and use `wget` in the tutorial to obtain the code via the raw source link. This is also done when modifications to a tool are needed to better support the tutorial. Anytime you need the user to obtain some code not already present in the sandbox, submit a pull request to one of the relevant repositories below to upload your code, in addition to a pull request here for the tutorial content. While writing and testing your tutorials, you may use any upload endpoint, but you must upload your code to one of the repositories below and use these endpoints in your tutorials before submitting your tutorial.
    * For Clang/LLVM: https://github.com/freeCompilerCamp/code-for-llvm-tutorials
    * For ROSE: https://github.com/freeCompilerCamp/code-for-rose-tutorials

## Creating Practicals
FreeCompilerCamp supports and encourages content that evaluates the user's gained knowledge after completing a tutorial in order to create a fully contained self-learning environment. We currently support two methods of doing this: "check your understanding"-like exercises (that we call *practicals*) and examinations/tests, the latter of which is currently in development. We expect that tests will only be able to added by select users, likely internal.

Practicals should be small exercises that the user completes *with the terminal*. For example, a practical may ask the user to write a simple translator that traverses the ROSE AST and counts the number of if statements. They should take approximately 15-25 minutes for the average user to complete. Think of practicals like a lab practical in a university setting, hence the name. The intention is for the user to complete a task to gain some experience based on what they have learned with some guidance.

As practicals are essentially "open-book" quizzes, the terminal environment is freely accessible by the user. An excellent strategy is to provide some skeleton code so that the user need only write code for a small component of a larger tool. We encourage contributors to also include a makefile with the skeleton code to avoid having the user figure out how to compile a tool. Contributors should upload resources needed in a practical to one of the GitHub repositories above, in a folder named `practical` within the folder of the tutorial (e.g., `rose-complex-types/practicals`). Include some clickable code snippets in your task content to make things easier for the student.

Evaluation of the user's implementation can be done in various ways within a practical. A common method is to provide some sample input code (also uploaded to one of our code upload repositories) and discuss the sample input in the task and what the expected output is. The user can then save their expected output to a file and a `diff` check could be run to compare the expected output against the user's output. We highly encourage contributors to create `make check` targets that perform this `diff` check automatically, meaning the user need only run `make check` in the terminal.

Other methods of evaluation could be to simply have the user count something and inform them of the correct number. Feedback (e.g., pass/fail) does not necessarily have to be given in practicals, though we encourage it where possible. We also encourage contributors to come up with their own methods of practical evaluation and feedback, keeping in mind that practicals are small in scope and are intended as simple exercises for the student.

Finally, be sure to link the practical to the landing page and to the related practical page. A single tutorial should have no more than one practical, but not all tutorials need practicals, although we encourage contributors to create them where appropriate.

An example practical can be viewed here: http://freecompilercamp.org/rose-complex-types-practical/ and its uploaded resources here: https://github.com/freeCompilerCamp/code-for-rose-tutorials/tree/master/rose-complex-types/practicals.

We recommend those interested in creating practicals to take a look at the examples above, paying special attention to the makefile.
