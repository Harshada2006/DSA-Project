cmake_minimum_required(VERSION 3.12)
project(EcoCollectEngine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include_directories(include)

# Main Executable
add_executable(eco_engine src/main.cpp)

# Test Executable
add_executable(eco_engine_tests tests/test_runner.cpp)

enable_testing()
add_test(NAME EngineUnitTests COMMAND eco_engine_tests)
