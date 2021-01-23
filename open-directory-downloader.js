const { spawn } = require('child_process');
const fs = require(`fs`);

const CONFIG = require(`./config`)

module.exports = class OpenDirectoryDownloader {

  constructor(executablePath, outputDirectory) {

    this.executable = executablePath || CONFIG.OpenDirectoryDownloaderPath;
    this.outputDir = outputDirectory || CONFIG.OpenDirectoryDownloaderOutputFolder;
    
  }

  scanUrl(url, keepJson = false) {
    return new Promise((resolve, reject) => {
    
      const oddProcess = spawn(this.executable, [`-u ${url}`, `--quit`, `--json`, `--upload-urls`, `--speedtest`]);

      let output = ``;
      let error = ``;
      
      oddProcess.stdout.on('data', (data) => {
        // console.log(`stdout: ${data}`);
        output += data;
      });
      
      oddProcess.stderr.on('data', (data) => {
        console.warn(`Error from ODD: ${data}`);
        error += data;
      });

      oddProcess.on(`error`, (err) => {
        return reject(err);
      })
      
      oddProcess.on('close', (code) => {

        if (code !== 1) {
          reject(new Error(`ODD exited with code ${code}: ${error}`));
        }

        if (output.split(`Finshed indexing`).length <= 1) {
          return reject(new Error(`ODD never finished indexing!`));
        }
        
        // const finalResults = output.split(`Finshed indexing`)[1];
        const finalResults = output.split(`Saving URL list to file...`)[1];

        console.log(`finalResults:`, finalResults);
        
        const redditOutputStartString = `|`;
        const redditOutputEndString = `^(Created by [KoalaBear84's OpenDirectory Indexer](https://github.com/KoalaBear84/OpenDirectoryDownloader/))`;
        const credits = `^(Created by [KoalaBear84's OpenDirectory Indexer](https://github.com/KoalaBear84/OpenDirectoryDownloader/))`;
        
        let redditOutput = `${redditOutputStartString}${finalResults.split(redditOutputStartString).slice(1).join(redditOutputStartString)}`.split(redditOutputEndString).slice(0, -1).join(redditOutputEndString);

        let sessionRegexResults = finalResults.match(/Saved\ session:\ (.*)/);
        if (!sessionRegexResults || sessionRegexResults.length <= 1) {
          return reject(new Error(`JSON session file not found!`));
        }
        let jsonFile = sessionRegexResults[1]; // get first capturing group. /g modifier has to be missing!

        let urlListRegexResults = finalResults.match(/Saved URL list to file:\ (.*)/);
        if (!urlListRegexResults || urlListRegexResults.length <= 1) {
          return reject(new Error(`URL list file not found!`));
        }
        let urlFile = urlListRegexResults[1];
        fs.unlinkSync(`${this.outputDir}/${urlFile}`);

        let results;
        try {

          results = JSON.parse(fs.readFileSync(`${this.outputDir}/${jsonFile}`));
          if (!keepJson) {
            fs.unlinkSync(`${this.outputDir}/${jsonFile}`);
          }
          
        } catch (err) {
          console.error(`err:`, err);

          resolve({
            scannedUrl: url,
            scanFile: `${this.outputDir}/${jsonFile}`,
            reddit: redditOutput,
            credits,
          })
          
        }

        resolve({
          scannedUrl: url,
          scan: results,
          scanFile: keepJson ? `${this.outputDir}/${jsonFile}` :  undefined,
          reddit: redditOutput,
          credits,
        })
        
      });
    
    })
  }
  
}