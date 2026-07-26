module.exports = {
  apps: [
    {
      name: "iot-backend",
      cwd: "/home/iot-platform/backend",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production"
      },
      restart_delay: 3000,
      max_restarts: 10
    },
    {
      name: "iot-mqtt-broker",
      cwd: "/home/iot-platform/mqtt-broker",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production"
      },
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
