FreeCompilerCamp supports and encourages content that evaluates the user's gained knowledge after completing a tutorial in order to create a fully contained self-learning environment. We currently support two methods of doing this: "check your understanding"-like exercises (that we call *practicals*) and exams. The major difference is that the terminal environment is not made available to the student in exams; instead, they are provided with a code text editor.

## Creating Practicals ##
Quick overview on the design of practicals:
  * Small hands-on exercises that take around 15-25 minutes to complete for the average user.
  * Basic test cases provided by the contributor - no more than 2. Feedback is basic; e.g., pass/fail.
  * Test cases and their expected output *must* be published in the practical.
  * Test case evaluation does not have to be automated, but can be.
  * Upload all resources needed for a practical to one of our tutorial code GitHub repositories. You *must* include clickable terminal commands that can automatically download these resources.
  * Student can use the terminal freely, including looking at other existing translators, using the debugger, etc.
  * A practical is related to only one tutorial.

Practicals are small exercises that the user completes *with the terminal*. For example, a practical may ask the user to write a simple translator that traverses the ROSE AST and counts the number of `const` type-qualified variables. They should take approximately 15-25 minutes for the average user to complete. Think of practicals like a lab practical in a university setting, hence the name. The intention is for the user to complete a task to gain some experience based on what they have learned with some guidance.

As practicals are essentially "open-book" quizzes, the terminal environment is freely accessible by the user. Contributors should create some starting resources for the student to use, including a Makefile, test case input code, and skeleton code. These resources should be uploaded to one our GitHub repositories for tutorial code:
  * For ROSE: https://github.com/freeCompilerCamp/code-for-rose-tutorials
  * For Clang/LLVM: https://github.com/freeCompilerCamp/code-for-llvm-tutorials

Please ensure that the resources are added to a folder named `practical` within the folder of the tutorial. You *must* include some clickable code snippets in your practical description that allows the student to download these resources; e.g., with `wget` or `curl`.

Provide some form of evaluation of test cases in the practical. This can be done as automated test cases, or simply informing the student of the result in the text (e.g., "the expected number of `const` type-qualified variables is 2"). If performing automated test cases, a strategy we encourage is to provide some input code and create a `make check` target that performs the evaluation. We also encourage contributors to come up with their own methods of practical evaluation and feedback, keeping in mind that practicals are small in scope and are intended as simple exercises for the student. Test cases *must* be shown in the practical description along with their expected output. No more than 2 test cases are allowed in a practical.

Finally, be sure to link the practical to the landing page and to the related practical page. A single tutorial should have no more than one practical, but not all tutorials need practicals, although we encourage contributors to create them where appropriate.

Before writing a practical, we recommend looking at an example practical here: http://freecompilercamp.org/rose-complex-types-practical/ and its uploaded resources here: https://github.com/freeCompilerCamp/code-for-rose-tutorials/tree/master/rose-complex-types/practicals. Notice our `make check` target that automatically performs a `diff check`.

No special Markdown tags are needed for practicals.

## Creating Exams ##
Quick overview on the design of practicals:
  * Less guided exercises that take around 30-45 minutes to complete for the average user.
  * Thorough test suite provided by the contributor - at least 3. Feedback must report a numeric score.
  * Test cases and their expected output can optionally be published in the practical.
  * Test case evaluation is automated by the server by a `make check` rule. A makefile is required with both a `make` target and a `make check` target.
  * Upload all resources needed for a practical to one of our tutorial code GitHub repositories.
  * Student have access to a code editor only to encourage critical thinking.
  * An exam can be related to more than one tutorial.
  * Some additional Markdown tags are required to create an exam.

In the YAML front matter, specify the layout as `layout: exam`. Additionally, add the following tags based on your exam:
   * `exam_name: <exam_name>`
   * `exam_language: c or c++ or cpp`
   * `image: freecompilercamp/pwc:rose-exam or freecompilercamp/pwc:llvm-exam`

Exams are less guided tasks that should take around 30-45 minutes to complete. Students do not have access to the terminal environment and instead have access to a code editor supporting C/C++ syntax highlighting. Students can build their written code and view any compilation errors, and can also run the test case evaluation. Contributors may choose to publish all or some of the test cases in the exam description if they choose, but it is not required.

Contributors must create a Makefile that contains a compilation target and a `make check` target. The former is for compilation and the latter for evaluation. Student submissions will *always* be uploaded as `<exam_name>_submission.C` or `<exam_name>_submission.cpp` and the command will always be run in the proper directory.

At least 3 test cases are required for an exam and the feedback must report a numeric score/grade. We highly encourage contributors to create a Python or shell script that automatically runs the student's submission on all input test case code, reporting back a numeric score. The `make check` target can then simply call this script and return the output from the script.

Resources should be uploaded to one of our GitHub tutorial code repositories (see links above in the practicals section). Create a new folder under the `exams` folder that *has the same name as your exam name*; i.e., the same name as the one provided in the `exam_name` Markdown tag. You can include some skeleton code if you like.

Please ensure your Makefile compiles and evaluates test cases appropriately before publishing the exam.

In summary, the server requires the following:
 * A Makefile with a compilation target. The server will only run the `make` command without any name. The output of this command (compilation success/errors) is returned to the student.
 * A `make check` rule in the Makefile. The server will run this for evaluation, so it can virtually support any test suite by providing a script for this rule. The output of this command is returned to the student.
 * A folder of the same name as the `exam_name` tag to be present in our related GitHub tutorial code repositories, under the `exams` directory.
 * The use of the `freecompilercamp/pwc:rose-exam` or `freecompilercamp/pwc:llvm-exam` images only.

An example exam can be viewed here: http://freecompilercamp.org/rose-complex-types-exam/ and the resources for it here: https://github.com/freeCompilerCamp/code-for-rose-tutorials/tree/master/exams/complex-types. You may want to also view the raw Markdown source of the exam here: https://raw.githubusercontent.com/freeCompilerCamp/freecompilercamp.github.io/master/_posts/2020-08-14-rose-complex-types-exam.markdown.

The Makefile and `eval_test.py` are the most import component. The Python script runs the student's compiled executable with the test case files (`test0.cpp`, `test1.cpp`, etc.) and captures their output. This is then compared to set expected output and a score is calculated based on the pass/fail ratio. The `make check` rule in the Makefile then calls this Python script and returns its output with `@echo`. We *highly* encourage contributors to use this as a starting point.
