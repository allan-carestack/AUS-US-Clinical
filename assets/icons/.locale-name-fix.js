const fs = require('fs').promises;
const path = require('path');

const cssFilePath = path.resolve(__dirname, '../../careflow/styles/libraries/icon/_cfl-icon.css');

const regionClassPrefix = '.cfl-icon--region';
const replacementPrefix = '.cfs-region-';
const regionCodes = ['au', 'gb', 'ie', 'sg', 'us'];

const replacementRules = regionCodes.map(regionCode => ({
  from: `${regionClassPrefix}-${regionCode}`,
  to: `${replacementPrefix}${regionCode} .cfl-icon-`
}));

async function updateCssFile() {
  try {
    let fileContents = await fs.readFile(cssFilePath, 'utf8');

    replacementRules.forEach(({ from, to }) => {
      fileContents = fileContents.replaceAll(from, to);
    });

    await fs.writeFile(cssFilePath, fileContents, 'utf8');
    console.log('File updated successfully');
  } catch (err) {
    console.error('Error reading or writing the file:', err);
  }
}

updateCssFile();
