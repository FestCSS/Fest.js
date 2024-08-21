const { exec } = require('child_process');

exec('node lib/index.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing file: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
