module.exports = {
  name: "careflow-icons",
  inputDir: "./", // (required)
  outputDir: "../../careflow/assets/careflow/fonts", // (required)
  fontTypes: ["woff2", "woff"],
  fontsUrl: "/assets/careflow/fonts",
  assetTypes: ["css"],
  tag: "span",
  prefix: "cfl-icon-",
  pathOptions: {
    css: "../../careflow/styles/libraries/icon/_cfl-icon.css",
  },
};