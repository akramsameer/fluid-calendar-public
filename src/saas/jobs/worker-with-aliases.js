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

  // Log environment variables
  console.log("Environment variables:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("APP_ENVIRONMENT:", process.env.APP_ENVIRONMENT);
  console.log("TEST_CRON:", process.env.TEST_CRON);
  console.log("DEBUG:", process.env.DEBUG);

  // Import the worker module
  const worker = require("./worker");

  // Explicitly call the main function if it exists
  if (typeof worker.main === "function") {
    console.log("Calling worker.main() function...");
    worker.main().catch((error) => {
      console.error("Error in worker.main():", error);
    });
  }

  console.log("Worker loaded successfully");
} catch (error) {
  console.error("Failed to load worker:", error);
  process.exit(1);
}
