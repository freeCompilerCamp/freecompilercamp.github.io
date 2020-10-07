---
layout: post
title:  "How to build OpenMP in LLVM with offloading support"
author: "@alokmishra.besu"
date:   2019-06-26
categories: beginner
tags: [llvm,clang,openmp,gpu,offloading]
image: freecompilercamp/pwc:llvm10-gpu
pwc: http://lab.racedetection.org
---

Llvm-10.0.0 now has GPU offloading support in their OpenMP implementation. But building and using this offloading support can sometimes be confusing. I have tried several ways of building LLVM, and failed several times. Finally I found a way which works for me. Personally I prefer to 
* first build and install llvm/clang using GCC, and then 
* use this fresh llvm installation to build OpenMP-10.0.0. 
This is the way which worked for me. 

In this tutorial I will be explaining the steps to first build llvm-10.0.0 with clang-10.0.0 and then use it to build openmp-10.0.0 with offloading support.

This online terminal runs on a virtual machine with NVIDIA GPU Tesla K80 and CUDA toolkit 10.1 installed.

Note: To reduce operation cost, the GPU instance has a limited power-on time window: 6:00 AM to 6 Pm in Pacific Time (Or 9am to 9pm Eastern time). The terminal will not show up if the time you visit this tutorial is outside of this time window. We welcome donations of GPU instances so we can expand the availability of GPU terminals.

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

**Concepts in this exercise:**
# A. Building llvm-10.0.0 with CMake
##### 1. Prerequisite softwares:
##### 2. Setup the following environment variables in our system
##### 3. Download LLVM and Clang
##### 4.1 Build with make
##### 4.2 Build with Ninja (Optional)
##### 5. Setting Environment Variables

# B. Building OpenMP with CMake
##### 1. Prerequisite
##### 2. Download OpenMP
##### 3. Build with make
##### 4. Detailed Explanation

# C. Compiling code with offloading support

---

LLVM is already built and installed ($LLVM_PATH) in this environment. The LLVM source code can be found on $LLVM_SRC. A normal LLVM build might take a couple of hours to complete. The next section (section A) is for people who want to learn about how to install LLVM. If you  are just interested in building OpenMP in LLVM please go to [Section B](#openmp). 

## A. Building llvm-10.0.0 with CMake
**[CMake](http://www.cmake.org/)**  is a cross-platform build-generator tool. CMake does not directly build the project, it generates the files needed by our build system *(GNU make, ninja, etc.)* for building LLVM.
 
We can either download the tar files from **[LLVM Download page](http://releases.llvm.org/download.html)** or we can checkout from their git repo. Here I will be using the download page, but git works in similar way.

### A.1 Prerequisite softwares:
1. GNU cmake (version 2.8 and above)
2. Gcc (version 5 and above. Keep below version 7 for OpenMP)
3. libelf, libffi, pkg-config

On Ubuntu 18.04, you can install all prerequisite software by typing the following commands:
```
sudo apt update
sudo apt install build-essential
sudo apt install cmake
sudo apt install -y libelf-dev libffi-dev
sudo apt install -y pkg-config
```

All three software packages have been installed in the terminal on the right side. We just need to confirm this:
```
$ which gcc
$ which cmake
```

### A.2 Setup the following environment variables in our system
The follow environment variables have already been set in the terminal on the right side. We just need to confirm this: 
```
$ echo $LLVM_SRC
$ echo $LLVM_PATH
```

On a personal system, please set these path as following
```
export LLVM_SRC=<Path of LLVM source code>
export LLVM_PATH=<Path where LLVM need to be installed>
 ```

### A.3 Download LLVM and Clang
Note - LLVM's 10.x release is already cloned into $LLVM_SRC. If you are trying to install in you personal system, run the following commands to download llvm and clang.

```
git clone https://github.com/llvm/llvm-project.git llvm-10.0.0.src
export LLVM_SRC=$PWD/llvm-10.0.0.src
cd $LLVM_SRC
git checkout -b release/10.x origin/release/10.x
```

### A.4.1 Build Clang/LLVM with make
Create a build directory in $HOME and get into it
```.term1
mkdir llvm_build && cd llvm_build
```
Run the cmake command. Here we are building llvm-10.0.0 and clang-10.0.0 using make build system.
CMAKE_BUILD_TYPE specifies the build type on single-configuration generators. Here we are giving the build type as RELEASE. We can also use DEBUG, if we want to build llvm in debug mode.
```WARNING``` - building llvm in debug mode will normally consume over 20GB of our space.

CMAKE_INSTALL_PREFIX specifies the install directory used by install command.

Other commonly used parameter are CMAKE_C_COMPILER and CMAKE_CXX_COMPILER for telling make which C compiler to use.
```.term1
cmake -DCLANG_OPENMP_NVPTX_DEFAULT_ARCH=sm_37 -DLIBOMPTARGET_NVPTX_COMPUTE_CAPABILITIES=37,60,70 -DLLVM_ENABLE_PROJECTS="clang;clang-tools-extra;libcxx;libcxxabi;lld;openmp" -DCMAKE_BUILD_TYPE=RELEASE -DCMAKE_INSTALL_PREFIX=$LLVM_PATH -DCMAKE_C_COMPILER=gcc -DCMAKE_CXX_COMPILER=g++ $LLVM_SRC/llvm
```

You need to know the Compute Capability version of your GPU. https://developer.nvidia.com/cuda-gpus lists such information. For example, some typical GPUs and their CC versions are:
* Tesla K80 3.7
* Tesla P100 6.0
* Tesla V100 7.0

Explanation for the cmake options used:
* We set the CMAKE_C_COMPILER and CMAKE_CXX_COMPILER to point to gcc and g++ respectively
* CLANG_OPENMP_NVPTX_DEFAULT_ARCH sets the default architecture when not passing the value during compilation. We should adjust the default to match the environment we’ll be using most of the time. The architecture must be prefix with sm_37, so Clang configured with the sm_37 command will build for the Tesla K80 by default.
* LIBOMPTARGET_NVPTX_COMPUTE_CAPABILITIES applies to the runtime libraries: It specifies a list of architectures that the libraries will be built for. This is an important parameter. As we cannot run on GPUs without a compatible runtime, we should pass all architectures we care about. Also, please note that the values are passed without the dot, so compute capability 7.0 becomes 70. We can also build for multiple compute capabilities by separating them with a comma. For instance, if we want to build for compute capabilities 3.5, 6.0 and 7.0, then use the parameter as -DLIBOMPTARGET_NVPTX_COMPUTE_CAPABILITIES=35,60,70. We can only build for compute capabilities over 3.5

For boosting performance sometimes we can use the /dev/shm as our temporary directory. /dev/shm is a temporary file storage filesystem, i.e., tmpfs, that uses RAM for the backing store. In an incremental build system a lot of temporary files are created while compilation. /tmp is the location for temporary files as defined in the Filesystem Hierarchy Standard, which is followed by almost all Unix and Linux distributions. This location is access by the TMPDIR environment variable. To make the process of compilation faster we can set the TMPDIR environment variable to point to a tmpfs directory, like /dev/shm. Caution should be taken before enabling this option. If we do not have enough RAM, this step might have an adverse effect on compilation.
```.term1
export TMPDIR=/dev/shm 
```
Once the required build files are created, we can start building using make. We can create as many threads as the number of processors. For instance, suppose your system has 4 cores on a node. So on this system we can run this command as make -j4. This will speedup the build process. ```WARNING``` - the make command will take a couple of hours to complete.

```.term1
make -j8
```
make install installs all the built llvm/clang files to the LLVM_PATH location.

```.term1
make install
```

### A.4.2 Build with Ninja (Optional)
**[Ninja](https://ninja-build.org)** is much faster than make. Where other build systems are high-level languages Ninja aims to be an assembler. Ninja build files are human-readable but not especially convenient to write by hand. These constrained build files allow Ninja to evaluate incremental builds quickly.

To build ninja supported files, we use the option -G Ninja

CMAKE_EXPORT_COMPILE_COMMANDS enables or disables output of compile commands during generation. If enabled, generates a compile_commands.json file containing the exact compiler calls for all translation units of the project in machine-readable form. This option is implemented only by Makefile Generators and the Ninja. Once the cmake command is successful, we need to copy the compile_commands.json file to the LLVM_SRC path.

The commands used to build using ninja are as follows:
```.term1
cmake -G Ninja -DCMAKE_EXPORT_COMPILE_COMMANDS=ON -DCLANG_OPENMP_NVPTX_DEFAULT_ARCH=sm_37 -DLIBOMPTARGET_NVPTX_COMPUTE_CAPABILITIES=37,60,70 -DLLVM_ENABLE_PROJECTS="clang;clang-tools-extra;libcxx;libcxxabi;lld;openmp" -DCMAKE_BUILD_TYPE=RELEASE -DCMAKE_INSTALL_PREFIX=$LLVM_PATH $LLVM_SRC/llvm
```
Once the required build files are created, we can start building using ninja just like before.
```.term1
ninja -j8
```
ninja install installs all the built llvm/clang files to the LLVM_PATH location.
```.term1
ninja install
```

### A.5 Setting Environment Variables
Following environment variables need to be set before using llvm/clang
```.term1
export PATH=$LLVM_PATH:$PATH
export LD_LIBRARY_PATH=$LLVM_PATH/libexec:$LD_LIBRARY_PATH
export LD_LIBRARY_PATH=$LLVM_PATH/lib:$LD_LIBRARY_PATH
export LIBRARY_PATH=$LLVM_PATH/libexec:$LIBRARY_PATH
export LIBRARY_PATH=$LLVM_PATH/lib:$LIBRARY_PATH
export MANPATH=$LLVM_PATH/share/man:$MANPATH
export C_INCLUDE_PATH=$LLVM_PATH/include:$C_INCLUDE_PATH
export CPLUS_INCLUDE_PATH=$LLVM_PATH/include:CPLUS_INCLUDE_PATH
```

Optional environment variables
```.term1
export CLANG_VERSION=10.0.0
export CLANG_PATH=$LLVM_PATH
export CLANG_BIN=$LLVM_PATH/bin
export CLANG_LIB=$LLVM_PATH/lib
```

## <a name="openmp"></a> B. Rebuilding Clang using Clang

### B.1 Build with make

```.term1
mkdir build2
cd build2
```
OpenMP building is quite small compared to llvm/clang. We can still use the ninja build system and TMPDIR to speedup our build process, but it won't make much of a difference.

The following cmake command line will configure the build we want

```.term1
cmake -DCMAKE_BUILD_TYPE=RELEASE -DLLVM_ENABLE_PROJECTS="clang;clang-tools-extra;libcxx;libcxxabi;lld;openmp" -DCMAKE_INSTALL_PREFIX=$LLVM_PATH -DCMAKE_C_COMPILER=$LLVM_PATH/bin/clang -DCMAKE_CXX_COMPILER=$LLVM_PATH/bin/clang++ -DCLANG_OPENMP_NVPTX_DEFAULT_ARCH=sm_37  -DLIBOMPTARGET_NVPTX_COMPUTE_CAPABILITIES=37,60,70 $(LLVM_SRC)/llvm
```

As always make will build OpenMP

```.term1
make -j4
```
 and *make install* will install the built files into the assigned path, here $LLVM_PATH.
```.term1
make install
```

## C. Compiling code with offloading support
Note: The terminal on the right side does not have cuda installed. So you cannot really compile, link and run the OpenMP code with offloading support in the terminal. The instructions below are used to guide you to try it on a machine with cuda installed. 

To compile a code with OpenMP GPU offloading support we must provide some compile time parameters to clang. 

You can download the following example code into the terminal and save it to be ongpu.c
```
#include <stdio.h>
#include <omp.h>

int main()
{
  int runningOnGPU = 0;
  /* Test if GPU is available using OpenMP4.5 */
#pragma omp target map(from:runningOnGPU)
  {
    if (omp_is_initial_device() == 0)
      runningOnGPU = 1;
  }
  /* If still running on CPU, GPU must not be available */
  if (runningOnGPU)
    printf("### Able to use the GPU! ### \n");
  else
    printf("### Unable to use the GPU, using CPU! ###\n");

  return 0;
}
```

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-llvm-tutorials/master/openmp-build/ongpu.c
```

Most common parameters are:

```.term1
clang -fopenmp -fopenmp-targets=nvptx64-nvidia-cuda ongpu.c
./a.out
```

Here, 
* -fopenmp instructs clang that it need to compile an OpenMP code.
* -fopenmp-targets instructs clang to use nvptx64-nvidia-cuda as the target device.

Optional options
* --cuda-path=<CUDA_INSTALL_PATH> suggests the location where cuda is installed.  
* -Xopenmp-target -march=sm_37  set the target architecture. For instance, while building for P100 we should use -Xopenmp-target -march=sm_60, while for V100 we should use -Xopenmp-target -march=sm_70

Before using clang to build OpenMP code for GPU offloading, we should always check if the compatible runtime is present or not. For instance, if we need to build for compute capability 3.5 we should check whether the library libomptarget-nvptx-sm_35.bc is present in the directory  $LLVM_PATH/lib. If not, then we should rebuild OpenMP with support for that compute capability.

That’s it. That’s all that you need to do to start using OpenMP with GPU support. 
Happy offloading!!
