module.exports = {}

module.exports.GitHubReleasesUrl = `https://api.github.com/repos/KoalaBear84/OpenDirectoryDownloader/releases`
module.exports.OpenDirectoryDownloaderVersion = {
  version: `v2.0.0.3`,
  releaseId: `47117728`
}
module.exports.OpenDirectoryDownloaderFolder = `${__dirname}/ODD`
module.exports.OpenDirectoryDownloaderOutputFolderName = `Scans`
module.exports.OpenDirectoryDownloaderOutputFolder = `${module.exports.OpenDirectoryDownloaderFolder}/${module.exports.OpenDirectoryDownloaderOutputFolderName}`
module.exports.OpenDirectoryDownloaderPath = `${module.exports.OpenDirectoryDownloaderFolder}/OpenDirectoryDownloader${process.platform === `win32` ? `.exe` : ``}`
