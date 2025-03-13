// This file sets up path aliases for Node.js runtime
const path = require("path");
const fs = require("fs");

// Find the root project directory (where package.json is)
function findProjectRoot(startDir) {
  let currentDir = startDir;

  console.log("Starting search for project root from:", currentDir);

  // Maximum 10 levels up to avoid infinite loop
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      console.log("Found package.json at:", currentDir);
      return currentDir;
    }

    // Check if src directory exists as an alternative indicator
    if (fs.existsSync(path.join(currentDir, "src"))) {
      console.log("Found src directory at:", currentDir);
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      console.log("Reached filesystem root without finding project root");
      break; // We've reached the root
    }
    currentDir = parentDir;
  }

  // If we can't find the project root, try some common locations in container
  const containerPaths = ["/app", "/usr/src/app", process.cwd()];
  for (const containerPath of containerPaths) {
    if (fs.existsSync(containerPath)) {
      console.log("Using container path as project root:", containerPath);
      return containerPath;
    }
  }

  // Default to the starting directory if we can't find package.json
  console.log("Defaulting to starting directory as project root:", startDir);
  return startDir;
}

// Get the project root
const projectRoot = findProjectRoot(__dirname);

// Check if src directory exists
const srcPath = path.join(projectRoot, "src");
if (!fs.existsSync(srcPath)) {
  console.error(`Error: src directory not found at ${srcPath}`);
  console.log("Current directory structure:");
  try {
    const files = fs.readdirSync(projectRoot);
    console.log(files);
  } catch (err) {
    console.error("Failed to read directory:", err);
  }
}

// Register the @ alias to point to the root/src directory
require("module").Module._resolveFilename = (function (
  originalResolveFilename
) {
  return function (request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      // First try the original path
      const originalPath = path.join(projectRoot, "src", request.substring(2));
      console.log(`Resolving @/ alias: ${request} -> ${originalPath}`);

      // Check if the file exists at the original path
      try {
        return originalResolveFilename.call(
          this,
          originalPath,
          parent,
          isMain,
          options
        );
      } catch (err) {
        // If not found, try looking in the dist directory for compiled files
        if (err.code === "MODULE_NOT_FOUND") {
          console.log(
            `Module not found at ${originalPath}, trying dist directory...`
          );

          // Try to find the module in the dist directory
          const distPath = path.join(projectRoot, "dist", request.substring(2));
          console.log(`Trying dist path: ${distPath}`);

          // For logger specifically, try the index.js file
          if (request === "@/lib/logger") {
            const loggerIndexPath = path.join(originalPath, "index.js");
            console.log(`Trying logger index path: ${loggerIndexPath}`);

            if (fs.existsSync(loggerIndexPath)) {
              console.log(`Found logger at ${loggerIndexPath}`);
              return originalResolveFilename.call(
                this,
                loggerIndexPath,
                parent,
                isMain,
                options
              );
            }
          }

          try {
            return originalResolveFilename.call(
              this,
              distPath,
              parent,
              isMain,
              options
            );
          } catch (distErr) {
            // If still not found, throw the original error
            console.error(
              `Module not found in dist directory either: ${distErr.message}`
            );
            throw err;
          }
        } else {
          throw err;
        }
      }
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
})(require("module").Module._resolveFilename);

console.log(
  "Module aliases registered. @ points to",
  path.join(projectRoot, "src")
);
