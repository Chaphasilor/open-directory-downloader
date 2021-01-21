module.exports = {
  GitHubReleasesUrl: `https://api.github.com/repos/KoalaBear84/OpenDirectoryDownloader/releases`,
  OpenDirectoryDownloaderVersion: {
    version: `v1.9.3.3`,
    releaseId: `36663866`
  },
  OpenDirectoryDownloaderFolder: `${__dirname}/ODD`,
  OpenDirectoryDownloaderOutputFolder: `${__dirname}/ODD/Scans`,
  OpenDirectoryDownloaderPath: `${__dirname}/ODD/OpenDirectoryDownloader${process.platform === `win32` ? `.exe` : ``}`,
}