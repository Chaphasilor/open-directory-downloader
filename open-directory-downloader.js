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
   * @param {Number} [options.statsInterval=15] the minimum interval (in seconds) for refreshing the scan stats 
   */
  constructor(options = {}) {

    this.executable = options.executablePath || CONFIG.OpenDirectoryDownloaderPath;
    this.outputDir = options.workingDirectory || CONFIG.OpenDirectoryDownloaderFolder;
    this.maxMemory = options.maximumMemory || Infinity
    this.statsInterval = options.statsInterval || 15

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
   * @param {Boolean} [options.parseScan=false] Parse the generated JSON file and include it in the `ScanResult`?
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
    const transcriber = new OutputTranscriber({
      statsInterval: this.statsInterval,
    })
    const promiseToReturn = new Promise((resolve, reject) => {

      if (!url || url.length === 0) {
        return reject([new ODDWrapperError(`Missing URL!`)])
      }
      
      options.keepJsonFile = options.keepJsonFile || false
      options.keepUrlFile = options.keepUrlFile || false
      options.parseScan = options.parseScan || false
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
      
      oddProcess.stdout.setEncoding(`utf8`)
      oddProcess.stderr.setEncoding(`utf8`)
      
      transcriber.startTranscribing(oddProcess.stdout, oddProcess.stderr, oddProcess.stdin)
      
      oddProcess.stdout.on('data', (data) => {

        let pidRegExp = /Started\ with\ PID\ (\d+)/
        if (!this.monitor && pidRegExp.test(data)) {

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

        // console.log(`transcriber.output:`, transcriber.output)
        
        if (transcriber.output.split(`Finished indexing`).length <= 1) {
          return reject([new ODDError(`ODD never finished indexing!`)]);
        }

        if (transcriber.output.split(`No URLs to save`).length > 1) {
          // ODD found no files or subdirectories
          return reject([new ODDError(`OpenDirectoryDownloader didn't find any files or directories on that site!`)]);
        }
        
        // const finalResults = output.split(`Finished indexing`)[1];
        const finalResults = transcriber.output.split(`Saving URL list to file..`)[1];

        if (!finalResults) {
          return reject([new ODDWrapperError(`Failed to parse ODD output!`)])
        }

        // console.log(`finalResults:`, finalResults);
        
        const redditOutputRegExp = options.performSpeedtest ?
          /Finished speedtest.*\r\nHttp status codes\r\n(?:.|\r\n)*?(^\|\*\*(?:.|\r\n)*?)\r\n\^\(Created by.*?\)\r\n\r\n/m :
          /Saved URL list.*\r\nHttp status codes\r\n(?:.|\r\n)*?(^\|\*\*(?:.|\r\n)*?)\r\n\^\(Created by.*?\)\r\n\r\n/m
        const redditOutputEndRegExp = /\^\(Created by \[KoalaBear84\'s OpenDirectory Indexer v.*?\]\(https:\/\/github\.com\/KoalaBear84\/OpenDirectoryDownloader\/\)\)/;
        const credits = transcriber.output.match(redditOutputEndRegExp)[0]
        
        if (!redditOutputRegExp.test(finalResults)) {
          return reject([new ODDWrapperError(`Failed to parse ODD output!`)])
        }
        let redditOutput = `|**Url` + finalResults.match(redditOutputRegExp)[1]
                           .split('|**Url').filter(Boolean).slice(-1)[0] // make sure there's only a single table

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

        const response = {
          scannedUrl: url.toString(),
          jsonFile: options.keepJsonFile ? jsonFile :  undefined,
          urlFile: options.keepUrlFile ? urlFile :  undefined,
          reddit: redditOutput,
          credits,
          missingFileSizes,
          stats: transcriber.stats,
        }

        let results;
        if (options.parseScan) {
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
            response.scan = results
            
          } catch (err) {
            
            // console.error(`Error while reading in the scan results:`, err);
            reject([
              new ODDWrapperError(`Error while reading in the scan results`),
              response,
            ])
              
          }
        }

        transcriber.stopTranscribing() //!!! needed to clear timeout intervals
        resolve(response)
        
      });
    
    })
    promiseToReturn.live = transcriber
    return promiseToReturn
  }
  
}

class OutputTranscriber extends EventEmitter {

  constructor(options) {

    super()

    this.options = {}
    this.options.statsInterval = options.statsInterval
    
    this.output = ``
    this.error = ``
    this.startLogging = false

    this.stats = {
      version: `unknown`,
      totalFiles: 0,
      totalSize: `unknown`,
      totalDirectories: 0,
      statusCodes: {},
      totalHTTPRequests: 0,
      totalHTTPTraffic: `unknown`,
      urlQueue: 0,
      urlThreads: 0,
      sizeQueue: 0,
      sizeThreads: 0,
    }

    this.startRegExp = /WARN Command\.ProcessConsoleInput/
    this.versionRegExp = /KoalaBear84\/OpenDirectoryDownloader v(.*?) / //!!! non-greedy & whitespace at the end is important
    this.statusCodesExtractorRegex = /Http status codes[\n\r]+((?:\d+: \d+[\n\r]+)+)/
    this.statusCodesRegex = /(\d+): (\d+)/
    this.fileStatsRegex = /Total files: (\d+), Total estimated size: (.*?)[\n\r]+/
    this.directoryStatsRegex = /Total directories: (\d+)/
    this.httpStatsRegex = /Total HTTP requests: (\d+), Total HTTP traffic: (.*?)[\n\r]+/
    this.queueStatsRegex = /Queue: (\d+) \((\d+) threads\), Queue \(filesizes\): (\d+) \((\d+) threads\)/
    
  }

  startTranscribing(stdout, stderr, stdin) {

    this.stdoutStream = stdout
    this.stderrStream = stderr
    this.stdinStream = stdin

    this.stdinStream.setEncoding(`utf8`)
    this.stdinStream.on('error', (err) => {}) // handle errors to prevent crashing
    this.stdinStreamIntervalId = setInterval(() => {
      this.stdinStream.write(`s`); // input `S` to trigger ODD stats output
    }, this.options.statsInterval * 1000);

    this.stdoutStream.on('data', (data) => {
      
      // detect version
      if (this.versionRegExp.test(data)) {
        this.stats.version = data.match(this.versionRegExp)[1]
      }
      
      if (!this.startLogging) {
        if (this.startRegExp.test(data)) {
          this.startLogging = true
        }
        return
      }
      
      this.output += data
      
      let statsUpdated = false

      // detect other stats
      if (this.statusCodesExtractorRegex.test(data)) {
        const statusCodeLines = data.match(this.statusCodesExtractorRegex)[1]
        statusCodeLines.split(`\n`).filter(Boolean).forEach(statusCodeLine => {
          const [match, code, amount] = statusCodeLine.match(this.statusCodesRegex)
          this.stats.statusCodes[code] = parseInt(amount)
        })
        statsUpdated = true
      }
      if (this.fileStatsRegex.test(data)) {
        const [match, files, size] = data.match(this.fileStatsRegex)
        this.stats.totalFiles = parseInt(files)
        this.stats.totalSize = size
        statsUpdated = true
      }
      if (this.directoryStatsRegex.test(data)) {
        const [match, dirs] = data.match(this.directoryStatsRegex)
        this.stats.totalDirectories = parseInt(dirs)
        statsUpdated = true
      }
      if (this.httpStatsRegex.test(data)) {
        const [match, requests, traffic] = data.match(this.httpStatsRegex)
        this.stats.totalHTTPRequests = parseInt(requests)
        this.stats.totalHTTPTraffic = traffic
        statsUpdated = true
      }
      if (this.queueStatsRegex.test(data)) {
        const [match, queue, threads, queueSizes, threadsSizes] = data.match(this.queueStatsRegex)
        this.stats.urlQueue = parseInt(queue)
        this.stats.urlThreads = parseInt(threads)
        this.stats.sizeQueue = parseInt(queueSizes)
        this.stats.sizeThreads = parseInt(threadsSizes)
        statsUpdated = true
      }
      
      this.emit(`logs`, data)
      //TODO add verbosity settings

      if (statsUpdated) {
        this.emit(`stats`, this.stats)
      }
      
    })
    
    this.stderrStream.on('data', (data) => {
      // console.debug(data)

      this.output += data
      this.error += data

      this.emit(`logs`, data)
      
    })

  }

  stopTranscribing() {

    clearInterval(this.stdinStreamIntervalId)
    
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
          return this.emit(`error`, err)
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
