module.exports = {}

module.exports.GitHubReleasesUrl = `https://api.github.com/repos/KoalaBear84/OpenDirectoryDownloader/releases`
module.exports.OpenDirectoryDownloaderVersion = {
  version: `v1.9.7.2`,
  releaseId: `44166542`
}
module.exports.OpenDirectoryDownloaderFolder = `${__dirname}/ODD`
module.exports.OpenDirectoryDownloaderOutputFolderName = `Scans`
module.exports.OpenDirectoryDownloaderOutputFolder = `${module.exports.OpenDirectoryDownloaderFolder}/${module.exports.OpenDirectoryDownloaderOutputFolderName}`
module.exports.OpenDirectoryDownloaderPath = `${module.exports.OpenDirectoryDownloaderFolder}/OpenDirectoryDownloader${process.platform === `win32` ? `.exe` : ``}`
