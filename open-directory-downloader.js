const { exec } = require('child_process');
const fs = require(`fs`);

const CONFIG = require(`./config`)

module.exports = class OpenDirectoryDownloader {

  constructor(executablePath = CONFIG.OpenDirectoryDownloaderPath, outputDirectory = CONFIG.OpenDirectoryDownloaderOutputFolder) {

    this.executable = executablePath;
    this.outputDir = outputDirectory;

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir)
    }
    
  }

  /**
   * Initiates the scan of the provided URL
   * @param {URL|String} url The URL to scan. Has to be a supported Open Directory
   * @param {Object} [options] Additional options for the scan
   * @param {String} [options.outputFile] The name of the output file(s). Defaults to the (safely formatted) URL.
   * @param {Boolean} [options.keepJsonFile=false] Keep the JSON file created by the OpenDirectoryDownloader binary after the scan is done?
   * @param {Boolean} [options.keepUrlFile=false] Keep the text file created by the OpenDirectoryDownloader binary after the scan is done?
   * @param {Boolean} [options.performSpeedtest=false] Perform a speed test after the scan is done? (usually takes a few seconds)
   * @param {Boolean} [options.uploadUrlFile=false] Automatically upload the file containing all the found URLs to GoFile?
   */
  scanUrl(url, options = {}) {
    return new Promise((resolve, reject) => {

      options.keepJsonFile = options.keepJsonFile || false
      options.keepUrlFile = options.keepUrlFile || false
      options.performSpeedtest = options.performSpeedtest || false
      options.uploadUrlFile = options.uploadUrlFile || false
    
      // both String and URL implement the toString() method, so just use that instead of detecting the type
      let processArgs = [`-u ${url}`, `--quit`, `--json`, ]
      if (options.performSpeedtest) {
        processArgs.push(`--upload-urls`)
      }
      if (options.performSpeedtest) {
        processArgs.push(`--speedtest`)
      }
      if (options.outputFile && options.outputFile.length > 0) {
        processArgs.push(`--output-file`)
        processArgs.push(options.outputFile)
      }

      const oddProcess = exec(`${this.executable} ${processArgs.join(` `)}`, {
        shell: true,
        cwd: this.outputDir,
      });

      let output = ``;
      let error = ``;

      oddProcess.stdout.setEncoding(`utf8`)
      oddProcess.stderr.setEncoding(`utf8`)
      
      oddProcess.stdout.on('data', (data) => {
        // console.log(`stdout: ${data}`);
        output += data;
      });
      
      oddProcess.stderr.on('data', (data) => {
        // console.warn(`Error from ODD: ${data}`);
        error += data;
      });

      oddProcess.on(`error`, (err) => {
        return reject([err]);
      })
      
      oddProcess.on('close', (code) => {

        if (code !== 1) {
          reject(new Error(`ODD exited with code ${code}: ${error}`));
        }

        // console.log(`output:`, output)
        
        if (output.split(`Finished indexing`).length <= 1) {
          return reject(new Error(`ODD never finished indexing!`));
        }

        if (output.split(`No URLs to save`).length > 1) {
          // ODD found no files or subdirectories
          return reject(new Error(`OpenDirectoryDownloader didn't find any files or directories on that site!`));
        }
        
        // const finalResults = output.split(`Finished indexing`)[1];
        const finalResults = output.split(`Saving URL list to file..`)[1];

        // console.log(`finalResults:`, finalResults);
        
        const redditOutputStartString = `|`;
        const redditOutputEndString = `^(Created by [KoalaBear84's OpenDirectory Indexer](https://github.com/KoalaBear84/OpenDirectoryDownloader/))`;
        const credits = `^(Created by [KoalaBear84's OpenDirectory Indexer](https://github.com/KoalaBear84/OpenDirectoryDownloader/))`;
        
        let redditOutput = `${redditOutputStartString}${finalResults.split(redditOutputStartString).slice(1).join(redditOutputStartString)}`.split(redditOutputEndString).slice(0, -1).join(redditOutputEndString);

        let sessionRegexResults = finalResults.match(/Saved\ session:\ (.*)/);
        if (!sessionRegexResults || sessionRegexResults.length <= 1) {
          return reject([new Error(`JSON session file not found!`)]);
        }
        let jsonFile = sessionRegexResults[1]; // get first capturing group. /g modifier has to be missing!

        let urlListRegexResults = finalResults.match(/Saved URL list to file:\ (.*)/);
        if (!urlListRegexResults || urlListRegexResults.length <= 1) {
          return reject([new Error(`URL list file not found!`)]);
        }
        let urlFile = urlListRegexResults[1];
        if (!options.keepUrlFile) {
          try {
            fs.unlinkSync(urlFile);
          } catch (err) {
            // console.error(`Failed to delete URL list file:`, err)
            // fail silently in production, because this isn't a critical error
            // could be changed once https://github.com/KoalaBear84/OpenDirectoryDownloader/issues/64 is fixed
          }
        }

        let results;
        try {

          results = JSON.parse(fs.readFileSync(jsonFile));
          if (!options.keepJsonFile) {
            try {
              fs.unlinkSync(jsonFile);
            } catch (err) {
              // console.error(`Failed to delete JSON file:`, err)
              // fail silently in production, because this isn't a critical error
              // could be changed once https://github.com/KoalaBear84/OpenDirectoryDownloader/issues/64 is fixed
            }
          }
          
        } catch (err) {
          
          // console.error(`Error while reading in the scan results:`, err);
          reject([
            new Error(`Error while reading in the scan results`),
            {
              scannedUrl: url.toString(),
              jsonFile: options.keepJsonFile ? jsonFile :  undefined,
              urlFile: options.keepUrlFile ? urlFile :  undefined,
              reddit: redditOutput,
              credits,
            },
          ])
            
        }

        resolve({
          scannedUrl: url.toString(),
          scan: results,
          jsonFile: options.keepJsonFile ? jsonFile :  undefined,
          urlFile: options.keepUrlFile ? urlFile :  undefined,
          reddit: redditOutput,
          credits,
        })
        
      });
    
    })
  }
  
}