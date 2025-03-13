// Load path aliases first
try {
  console.log("Loading path aliases...");
  require("./register-aliases");
  console.log("Path aliases loaded successfully");
} catch (error) {
  console.error("Failed to load path aliases:", error);
  process.exit(1);
}

// Now load the actual worker
try {
  console.log("Loading worker...");
  require("./worker");
  console.log("Worker loaded successfully");
} catch (error) {
  console.error("Failed to load worker:", error);
  process.exit(1);
}
