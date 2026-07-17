module.exports = {
  apps: [
    {
      name: "budget-tool-frontend",
      script: "npx",
      args: ["http-server", "frontend/dist", "--port", "3001", "--gzip"],
      instances: 1,
      exec_mode: "fork",
      cwd: "/opt/budget-tool"
    },
    {
      name: "budget-tool-pocketbase",
      script: "./pocketbase",
      args: "serve --http=0.0.0.0:8090",
      instances: 1,
      exec_mode: "fork",
      cwd: "/opt/budget-tool"
    }
  ]
};
