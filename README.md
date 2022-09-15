# A NodeJS Wrapper around OpenDirectoryDownloader

[![npm](https://img.shields.io/npm/v/open-directory-downloader?style=for-the-badge)](https://npmjs.com/package/open-directory-downloader)

This is a wrapper around [KoalaBear84/OpenDirectoryDownloader](https://github.com/KoalaBear84/OpenDirectoryDownloader), exposing functionality and output of the CLI in JavaScript.

Open Directory Downloader is a CLI tool for indexing so-called *Open Directories* (ODs), which are HTTP servers exposing files and folders for browsing and downloading. For more info about Open Directories visit [the subreddit](https://reddit.com/r/opendirectories)

## Installation

```shell
npm i open-directory-downloader
```

Upon installation, the latest supported OpenDirectoryDownloader binary will automatically be downloaded from GitHub.  
If this should fail, a local installation can be used instead (see below).

For changelogs, please look at the [GitHub release page](https://github.com/Chaphasilor/open-directory-downloader/releases).

## Usage

```js
const odd = require(`open-directory-downloader`);

const indexer = new odd.OpenDirectoryDownloader();

indexer.scanUrl(url)
.then(scanResult => {
  console.log(scanResult)
  // {
  //   scannedUrl: 'https://example.com/files',
  //   scan: {...},
  //   jsonFile: '/full/path/to/scan/file',
  //   urlFile: '/full/path/to/url/file',
  //   reddit: '|**Url:** [https://example.com/files](https://example.com/files)||[Urls file](https://gofile.io/?c=XXXXX)|\r\n' +
  //     '|:-|-:|-:|\r\n' +
  //     '|**Extension (Top 5)**|**Files**|**Size**|\r\n' +
  //     '|.iso|70|2.2 TiB|\r\n' +
  //     '|.mkv|40|796.3 GiB|\r\n' +
  //     '|.zip|16|200.39 GiB|\r\n' +
  //     '|.rar|1|71 GiB|\r\n' +
  //     '|.mp4|1|32 GiB|\r\n' +
  //     '|**Dirs:** 188 **Ext:** 34|**Total:** 572|**Total:** 3.39 TiB|\r\n' +
  //     '|**Date (UTC):** 2021-10-17 12:13:31|**Time:** 00:00:20||\r\n',
  //   credits: "^(Created by [KoalaBear84's OpenDirectory Indexer v2.1.0.0](https://github.com/KoalaBear84/OpenDirectoryDownloader/))",
  //   missingFileSizes: false,
  //   stats: {
  //     version: '2.1.0.0',
  //     totalFiles: 572,
  //     totalSize: '3.39 TiB',
  //     totalDirectories: 188,
  //     statusCodes: { '200': 188 },
  //     totalHTTPRequests: 188,
  //     totalHTTPTraffic: '353.19 kiB',
  //     urlQueue: 0,
  //     urlThreads: 0,
  //     sizeQueue: 0,
  //     sizeThreads: 0
  //   }
  // }
}
```

## Compatible Versions of OpenDirectoryDownloader

| Wrapper Version | Supported ODD Versions (up to) | Included Version |
| --- | --- | --- |
| **9.0.1** | **v2.4.4.3+** | **v2.4.4.3** |
| 9.0.0 | v2.4.4.3+ | v2.4.4.3 |
| 8.0.2 | v2.4.4.3+** | v2.4.4.1 |
| 8.0.0 | v2.4.4.3+ | v2.3.1.4 |
| 7.0.0 | 2.2.0.1-2.2.0.2 | 2.2.0.2 |
| 6.2.0 | 2.1.0.8 | 2.1.0.8 |
| 6.1.2 | 2.1.0.0 | 2.1.0.0 |
| 6.1.0 | 2.1.0.0 | 2.1.0.0 |
| 5.1.0 | 2.0.0.6 | 2.0.0.3 |
| 5.0.0 | 2.0.0.2 | 2.0.0.0 |
| 4.0.3 | 1.9.6.1 | 1.9.6.1 |
| 4.0.2 | 1.9.6.1 | 1.9.5.5 |
| 4.0.1 | 1.9.6.1 | 1.9.4.6 |
| 4.0.0 | 1.9.6.1 | 1.9.4.6 |
| 3.1.2 | 1.9.6.1 | 1.9.4.6 |
| 3.1.1 | 1.9.6.1 | 1.9.4.5 |
| 3.1.0 | 1.9.6.1 | 1.9.4.4 |
| 3.0.0 | 1.9.4.3 | 1.9.3.9 |
| 2.0.0 | 1.9.4.3 | 1.9.3.8 |
| 1.1.0 | 1.9.4.3 | 1.9.3.6 |
| 1.0.0 | 1.9.3.1-1.9.3.5 | 1.9.3.3 |

Some intermediary releases might not be fully supported. It is recommended to use the versions that are included by default.

## API

### Class OpenDirectoryDownloader

#### OpenDirectoryDownloader(options)

*Constructor*

- `options` (`Object`) (optional): Additional options for the scan
  - `outputFile` (`String`) (optional, defaults to the escaped URL): The name of the output file(s). Can also be a full path. Don't include an extension, as multiple files with different extensions will be generated.
  - `executablePath` (`String`) (optional) The full path to the OpenDirectoryDownloader executable.  
    Allows you to use a custom OpenDirectoryDownloader binary.
  - `workingDirectory` (`String`) (optional) The full path to the directory where OpenDirectoryDownloader saves its scan files.
  - `maximumMemory` (`Number`) (optional, default is `Infinity`) The maximum allowed memory usage in bytes for each scan.  
  - `statsInterval` (`Number`) (optional, default is `15`) The *minimum* interval (in seconds) for refreshing the scan stats (applies to `ScanResultPromise.live`). ODD might output additional stats periodically, so the `stats` event might get emitted more often.
- Returns: An instance of `OpenDirectoryDownloader`

#### OpenDirectoryDownloader.scanUrl(url[, options])  

*Initiates the scan of the provided URL*

- `url` (`String` or `URL` Object) (required): The URL to scan/index.
- `options` (`Object`) (optional): Additional options for the scan
  - `outputFile` (`String`) (optional, defaults to the escaped URL): The name of the output file(s). Can also be a full path. Don't include an extension, as multiple files with different extensions will be generated.
  - `keepJsonFile` (`Boolean`) (optional, default is `false`): Keep the JSON-file generated by the OpenDirectoryDownloader binary after the scan?
  - `keepUrlFile` (`Boolean`) (optional, default is `false`): Keep the text-file generated by the OpenDirectoryDownloader binary after the scan?
  - `parseScan` (`Boolean`) (optional, default is `false`): Parse the generated JSON file and include it in the `ScanResult`?
  - `performSpeedtest` (`Boolean`) (optional, default is `false`): Perform a speed test after the scan is done? (usually takes a few seconds)  
    **Note:** For some OD formats, speed test are disabled by OpenDirectoryDownloader. For these, no test results will be included in `ScanResult.scan.SpeedtestResult`.
  - `uploadUrlFile` (`Boolean`) (optional, default is `false`): Automatically upload the file containing all the found URLs to GoFile?
  - `fastScan` (`Boolean`) (optional, default is `false`): Disable slow operations during the scan, like HEAD requests. This can result in file sizes being reported as "0" or "n/a", if the OD doesn't show file sizes next to the file names.
  - `exactSizes` (`Boolean`) (optional, default is `false`) Use HEAD requests to retrieve exact file sizes
  - `userAgent` (`String`) (optional, default is `""`) Use a custom user agent for all HTTP requests
  - `auth` (`Object`) (optional) Used to configure (HTTP Basic) auth settings
    - `username` (`String`) (optional, default is `""`) The user name to use for authentication
    - `password` (`String`) (optional, default is `""`) The password to use for authentication
  - `headers` (`Object`) (optional) Used to configure additional headers to be sent with each request (cookies, referrers, etc.). Headers are key-value pairs of strings. `userAgent` and `auth` will overwrite any equivalent custom headers, if provided.
  - `threads` (`Number`) (optional, default is `5`) Number of threads to use for scanning
  - `timeout` (`Number`) (optional, default is `100`) Number of seconds to wait before timing out
- **Returns**: Promise<Resolves to `ScanResult` | Rejects to `Array<Error[,ScanResult]>`>  
  **The promise also has a `live` property (see below).**  
  If the promise rejects, it will return an array where the first element is always an `Error` object and there might also be a second element, which is a `ScanResult` but without the `ScanResult.scan` property.

#### ScanResultPromise

*The promise returned when starting a scan, resolves to `ScanResult`*

- `live` An `EventEmitter` providing the following events:
  - *EVENT* `logs` (`String`) Emitted every time ODD outputs new logs, containing only the new logs (including errors)
  - *EVENT* `stats` (`Object`) Emitted every time ODD outputs the current scan stats.  
    - `version` (`String`) the detected version of ODD
    - `totalFiles` (`Number`) the total amount of files found in the OD
    - `totalSize` (`String`) the (estimated) total size of all the files, in human-readable form
    - `totalDirectories` (`Number`) the total amount of subdirectories found in the OD
    - `statusCodes` (`Object`) an object containing status codes as *keys* and the number of times that status code was returned as *values*
    - `totalHTTPRequests` (`Number`) the total amount of HTTP requests made while scanning
    - `totalHTTPTraffic` (`String`) the total HTTP traffic generated while scanning, in human-readable form
    - `urlQueue` (`Number`) the amount of URLs that still need to be indexed
    - `urlThreads` (`Number`) the amount of threads used for indexing the remaining URLs
    - `sizeQueue` (`Number`) the amount of URLs/files for which the size still needs to be determined
    - `sizeThreads` (`Number`) the amount of threads used for determining the file sizes

The `live` property also has some sub-properties:

- `output` (`String`) All the logs generated by ODD during the current scan. Same properties as the object emitted by the `logs` event above.
- `error` (`String`) All the *error* logs generated by ODD during the current scan
- `stats` (`Object`) The current stats. Same properties as the object emitted by the `stats` event above.

#### ScanResult

*The object returned when the promise resolves*

- `scannedUrl` The URL that was scanned
- [`scan`] The parsed JSON-Object created by the OpenDirectoryDownloader binary. Can be very large depending on the size of the Open Directory.  
   Only included if `options.parseScan` was set to `true`
- `jsonFile` The full path to the created JSON-file.  
  Only included if `keepJsonFile` was set to `true`.
- `urlFile` The full path to the created text-file.  
  Only included if `keepUrlFile` was set to `true`.
- `reddit` The markdown-formatted table containing the stats for the Open Directory.  
  Does not include the credits.
- `credits` The markdown signature containing a link to KoalaBear84/OpenDirectoryDownloader
- `missingFileSizes` If the `fastScan` option is enabled and the OD doesn't list file sizes, OpenDirectoryDownloader has no way of getting the file sizes, and this boolean will be set to `true`.

### Custom Errors

`open-directory-downloader` implements various custom errors to better indicate *what* went wrong. These errors can be used for more precise error handling, but also handled like a regular error without special treatment.

#### ODDError

An error indicating that the OpenDirectoryDownloader binary encountered an error.  
*Often indicates that the URL couldn't be scanned, because it isn't supported.*

#### ODDOutOfMemoryError

An error indicating that the OpenDirectoryDownloader process used more memory than allowed by `options.maximumMemory`.

#### ODDWrapperError

An error indicating that the wrapper itself encountered an error.  
*This could be related to e.g. file system issues (deleted files, permission issues, etc.).*

## Examples

### Custom Scan Options

```js
const odd = require(`open-directory-downloader`);

const indexer = new odd.OpenDirectoryDownloader();

indexer.scanUrl(url, {
  outputFile: `/path/to/filename/without/extension`,
  keepJsonFile: true,
  keepUrlFile: true,
  parseScan: true,
  performSpeedtest: true,
  uploadUrlFile: true,
})
.then(scanResult => {
  console.log(scanResult)
})
.catch(console.error)
```

### Live Logs & Stats

```js
const odd = require(`open-directory-downloader`);

const indexer = new odd.OpenDirectoryDownloader({
  statsInterval: 5, // 5 seconds
});

let scan = indexer.scanUrl(url)

scan.live.on(`logs`, (newLogs) => {
  console.logs(newLogs)
})
scan.live.on(`stats`, (newStats) => {
  console.logs(newStats)
})

scan.then(scanResult => {
  console.log(scanResult)
})
.catch(console.error)
// or:
// let scanResult = await scan

```

### Error Handling

```js
const odd = require(`open-directory-downloader`);

const indexer = new odd.OpenDirectoryDownloader();

indexer.scanUrl(url)
.catch(err => {
  if (err instanceof odd.ODDError) {
    console.log(err.name) // 'ODDError'
  } else if (err instanceof odd.ODDWrapperError) {
    console.log(err.name) // 'WrapperError'
    console.log(err[0]) // logs the actual error
    if (err.length > 1) {
      console.log(err[1]) // logs a `ScanResult`, possibly with some fields (like `ScanResult.scan`) missing
    }
  }
  } else if (err instanceof odd.ODDOutOfMemoryError) {
    console.log(err.name) // 'OutOfMemoryError'
  }
})
```
