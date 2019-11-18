Adding a tutorial involves two web pages.
* One is a newly created tutorial page written in Markdown.  
* The other is the landing page also written in Markdown, in which you need to add a link to the page of the new tutorial.
  * For Clang/LLVM tutorials, the landing page is ./_posts/2019-11-06-clang-llvm-landing.markdown
  * For ROSE tutorials, the landing page is ./_posts/2019-11-06-rose-landing.markdown

After editing these two files, you can start a pull request. The main website has a cron job to automatically update itself based on changes to this repo's master branch.

### Tutorial Page
Take the autoPar tutorial as an example.
https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-07-01-rose-autopar.markdown

You can create a new similar Markdown file named ```2019-07-01-rose-your-tutorial.markdown``` and put it in the folder ```./_posts```. Please note that the file must follow the date-tutorial-name.markdown convention to be linked to a parent web page later. 

#### 1. Update headers

Add title, author, date and so on.

#### 2. Add content

Write freely in Markdown. 

Some special syntax: 
* For the code only for browsing, use a pair of triple backticks \`\`\` to include them.
* For the code clickable and executed in the sandbox, use ```.term1``` as code snippet type.

For example,  in the following example, ```echo HELLO``` contained in ```.term1``` code snippet will print ``HELLO`` in the sandbox terminal.

There are some built-in environment variables to faciliate the creation of command lines:
* For ROSE: $ROSE_BUILD, 
* For Clang/LLVM: $LLVM_PATH, $LLVM_BUILD, $LLVM_SRC

Sometimes you want to insert a figure into your tutorial. You need to 
* First create the figure and save it into a png file
* Upload the png file to top_dir/compiler-classroom/images
* Inside of your tutorial, add a link to the figure: 
```
![Your wonderful figure caption here](/images/your_figure_name.png)
```

#### 3. Update sandbox docker image (optionally)

Currently in the sandbox terminal, basic development tools have been installed, such as ```gcc```, ```rose```, ```llvm``` and ```vim```. If any other tool is required for your tutorials, you can either ask the visitors to install them as part of your tutorials. Or you can add them in the docker image.

To customize the sandbox, please check [Deploy FreeCC to AWS](https://github.com/chunhualiao/freeCompilerCamp/wiki/Deploy-FreeCC-to-AWS).

## Landing Pages

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
