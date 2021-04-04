const { spawn } = require('child_process');
const fs = require(`fs`);
const { EventEmitter } = require(`events`)

const pidusage = require('pidusage');

const CONFIG = require(`./config`)
const { ODDError, ODDWrapperError, ODDOutOfMemoryError } = require(`./errors`)

module.exports.ODDError = ODDError
module.exports.ODDWrapperError = ODDWrapperError
module.exports.ODDOutOfMemoryError = ODDOutOfMemoryError

module.exports.OpenDirectoryDownloader = class OpenDirectoryDownloader {

  /**
   * Creates a new instance  
   * Doesn't start ODD yet
   * @param {Object} [options] options that apply to all scans
   * @param {String} [options.executablePath] the full path to the custom ODD binary to use (instead of the bundled one)
   * @param {String} [options.workingDirectory] the full path to the custom current working directory (location of output files)
   * @param {Number} [options.maximumMemory=Infinity] the maximum allowed memory usage in bytes for the ODD process
   */
  constructor(options = {}) {

    this.executable = options.executablePath || CONFIG.OpenDirectoryDownloaderPath;
    this.outputDir = options.workingDirectory || CONFIG.OpenDirectoryDownloaderOutputFolder;
    this.maxMemory = options.maximumMemory || Infinity

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
   * @param {Boolean} [options.fastScan=false] Only perform actions that are fast, so no HEAD requests, etc. Might result in missing file sizes
   * @param {Boolean} [options.exactSizes=false] Use HEAD requests to retrieve exact file sizes
   * @param {String} [options.userAgent=""] Use a custom user agent for all HTTP requests
   * @param {Object} [options.auth] Used to configure (HTTP Basic) auth settings
   * @param {String} [options.auth.username=""] The user name to use for authentication
   * @param {String} [options.auth.password=""] The password to use for authentication
   * @param {Number} [options.threads=5] Number of threads to use for scanning
   * @param {Number} [options.timeout=100] Number of seconds to wait before timing out
   */
  scanUrl(url, options = {}) {
    return new Promise((resolve, reject) => {

      if (!url || url.length === 0) {
        return reject([new ODDWrapperError(`Missing URL!`)])
      }
      
      options.keepJsonFile = options.keepJsonFile || false
      options.keepUrlFile = options.keepUrlFile || false
      options.performSpeedtest = options.performSpeedtest || false
      options.uploadUrlFile = options.uploadUrlFile || false
      options.fastScan = options.fastScan || false
      options.exactSizes = options.exactSizes || false
    
      // both String and URL implement the toString() method, so just use that instead of detecting the type
      let processArgs = [`-u "${url}"`, `--quit`, `--json`, ]
      if (options.uploadUrlFile) {
        processArgs.push(`--upload-urls`)
      }
      if (options.performSpeedtest) {
        processArgs.push(`--speedtest`)
      }
      if (options.fastScan) {
        processArgs.push(`--fast-scan`)
        //TODO Output indication in ODD if file sizes are not being retrieved
      }
      if (options.exactSizes) {
        processArgs.push(`--exact-file-sizes`)
      }
      if (options.threads) {
        processArgs.push(`--threads`)
        processArgs.push(String(options.threads))
      }
      if (options.timeout) {
        processArgs.push(`--timeout`)
        processArgs.push(String(options.timeout))
      }
      if (options.outputFile && options.outputFile.length > 0) {
        processArgs.push(`--output-file`)
        processArgs.push(`"${options.outputFile}"`)
      }
      // breaks parsing, and fs is used anyway to load the scan results...
      // if (!(options.outputFile && options.outputFile.length > 0) || options.uploadUrlFile) {
      //   processArgs.push(`--no-urls`)
      // }
      if (options.userAgent && options.userAgent.length > 0) { //TODO fix bug in ODD to allow for empty user agent
        processArgs.push(`--user-agent`)
        processArgs.push(`"${options.userAgent}"`)
      }
      if (options.auth?.username) {
        processArgs.push(`--username`)
        processArgs.push(`"${options.auth.username}"`)
      }
      if (options.auth?.password) {
        processArgs.push(`--password`)
        processArgs.push(`"${options.auth.password}"`)
      }

      const oddProcess = spawn(this.executable, processArgs, {
        shell: true,
        cwd: this.outputDir,
        detached: false,
      });

      let output = ``;
      let error = ``;

      oddProcess.stdout.setEncoding(`utf8`)
      oddProcess.stderr.setEncoding(`utf8`)
      
      oddProcess.stdout.on('data', (data) => {

        let pidRegExp = /Started\ with\ PID\ (\d+)/
        if (pidRegExp.test(data)) {

          oddProcess.oddPid = data.match(pidRegExp)[1]

          this.monitor = new MemoryMonitor(oddProcess.oddPid)
          this.monitor.startMonitoring()
          this.monitor.on(`usage`, (memoryUsage) => {
            
            this.memoryUsage = memoryUsage
            if (this.memoryUsage > this.maxMemory) {
              process.kill(oddProcess.oddPid, `SIGKILL`) // force-kill ODD process
              oddProcess.kill() // kill the wrapping child process
              return reject([new ODDOutOfMemoryError(`ODD process killed because it exceeded the memory limit!`, {
                usage: this.memoryUsage,
                limit: this.maxMemory,
              })])
            }

          })
          this.monitor.on(`error`, (err) => {
            return reject([new ODDWrapperError(`Error with memory monitoring!`, err)])
          })
          
        }
        
        console.debug(`stdout: ${data}`);
        output += data;

      });
      
      oddProcess.stderr.on('data', (data) => {
        // console.warn(`Error from ODD: ${data}`);
        error += data;
      });

      oddProcess.on(`error`, (err) => {
        // console.error(`error:`, err)
        return reject([new ODDWrapperError(err.message)]);
      })

      oddProcess.on(`exit`, (code, signal) => {

        this.monitor.stopMonitoring()
        this.memoryUsage = 0

      })
      
      oddProcess.on('close', (code, signal) => {

        if (!code) {
          return reject([new ODDError(`ODD was killed by '${signal}'`)]);
        }
        if (code !== 1) {
          return reject([new ODDError(`ODD exited with code '${code}'`)]);
        }

        // console.log(`output:`, output)
        
        if (output.split(`Finished indexing`).length <= 1) {
          return reject([new ODDError(`ODD never finished indexing!`)]);
        }

        if (output.split(`No URLs to save`).length > 1) {
          // ODD found no files or subdirectories
          return reject([new ODDError(`OpenDirectoryDownloader didn't find any files or directories on that site!`)]);
        }
        
        // const finalResults = output.split(`Finished indexing`)[1];
        const finalResults = output.split(`Saving URL list to file..`)[1];

        if (!finalResults) {
          return reject([new ODDWrapperError(`Failed to parse ODD output!`)])
        }

        // console.log(`finalResults:`, finalResults);
        
        const redditOutputStartString = `|`;
        const redditOutputEndString = `^(Created by [KoalaBear84's OpenDirectory Indexer](https://github.com/KoalaBear84/OpenDirectoryDownloader/))`;
        const credits = `^(Created by [KoalaBear84's OpenDirectory Indexer](https://github.com/KoalaBear84/OpenDirectoryDownloader/))`;
        
        let redditOutput = `${redditOutputStartString}${finalResults.split(redditOutputStartString).slice(1).join(redditOutputStartString)}`.split(redditOutputEndString).slice(0, -1).join(redditOutputEndString);

        let missingFileSizes = redditOutput.includes(`**Total:** n/a`)

        let sessionRegexResults = finalResults.match(/Saved\ session:\ (.*)/);
        if (!sessionRegexResults || sessionRegexResults.length <= 1) {
          return reject([new ODDWrapperError(`JSON session file not found!`)]);
        }
        let jsonFile = sessionRegexResults[1]; // get first capturing group. /g modifier has to be missing!

        let urlListRegexResults = finalResults.match(/Saved URL list to file:\ (.*)/);
        if (!urlListRegexResults || urlListRegexResults.length <= 1) {
          return reject([new ODDWrapperError(`URL list file not found!`)]);
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
            new ODDWrapperError(`Error while reading in the scan results`),
            {
              scannedUrl: url.toString(),
              jsonFile: options.keepJsonFile ? jsonFile :  undefined,
              urlFile: options.keepUrlFile ? urlFile :  undefined,
              reddit: redditOutput,
              credits,
              missingFileSizes,
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
          missingFileSizes,
        })
        
      });
    
    })
  }
  
}

class MemoryMonitor extends EventEmitter {

  constructor(pid) {

    super()
    
    this.pid = pid

  }

  startMonitoring() {

    this.intervalId = setInterval(() => {
      pidusage(this.pid, (err, stats) => {
    
        if (err && err.message !== `No matching pid found`) {
          return this.emit(`error`)
        }

        if (stats?.memory) {
          this.emit(`usage`, stats.memory)
        }
        
      })
    }, 500)
    
  }

  stopMonitoring() {
    clearInterval(this.intervalId)
  }
  
}