const fs = require(`fs`)

const fetch = require(`node-fetch`)
const AdmZip = require(`adm-zip`)

const CONFIG = require(`./config`)
const platform = process.platform
const architecture = process.arch

fetch(`${CONFIG.GitHubReleasesUrl}/${CONFIG.OpenDirectoryDownloaderVersion.releaseId}/assets`).then(res => res.json()).then(assets => {

  let releaseName
  
  if (architecture === `arm` && platform === `linux`) {

    releaseName = `OpenDirectoryDownloader-linux-arm-self-contained.zip`

  } else if (architecture === `arm64` && platform === `linux`) {

    releaseName = `OpenDirectoryDownloader-linux-arm64-self-contained.zip`

  } else if (architecture === `x64` && platform === `linux`) {

    releaseName = `OpenDirectoryDownloader-linux-x64-self-contained.zip`

  } else if (architecture === `x64` && platform === `darwin`) {

    releaseName = `OpenDirectoryDownloader-osx-x64-self-contained.zip`

  } else if (architecture === `x64` && platform === `win32`) {

    releaseName = `OpenDirectoryDownloader-win-x64-self-contained.zip`

  } else {
    throw new Error(`Platform '${platform}' on architecture '${architecture}' is not supported by OpenDirectoryDownloader :(\nYou could try requesting support for it at https://github.com/KoalaBear84/OpenDirectoryDownloader ...`)
  }

  let asset = assets.find(asset => asset.name === releaseName)

  if (!asset) {
    throw new Error(`Executable not found on GitHub: ${releaseName} for version '${CONFIG.OpenDirectoryDownloaderVersion.version}'`)
  }
  
  let downloadUrl = asset.browser_download_url

  console.log(`Creating ODD directory...`)
  fs.mkdirSync(CONFIG.OpenDirectoryDownloaderFolder)
  
  console.log(`Starting download of OpenDirectoryDownloader executable...`)
  fetch(downloadUrl)
  .then(res => {

    if (!res.ok) {
      throw new Error(`Failed to download executable from GitHub!`)
    }

    const dest = fs.createWriteStream(`${CONFIG.OpenDirectoryDownloaderFolder}/ODD.zip`)
    res.body.pipe(dest)

    res.body.on(`end`, () => {

      let zip = new AdmZip(`${CONFIG.OpenDirectoryDownloaderFolder}/ODD.zip`)
      zip.extractAllTo(CONFIG.OpenDirectoryDownloaderFolder, true)

      console.log(`Deleting zip after extraction...`)
      fs.unlinkSync(`${CONFIG.OpenDirectoryDownloaderFolder}/ODD.zip`)
      
      console.log(`OpenDirectoryDownloader has been installed successfully to ${CONFIG.OpenDirectoryDownloaderFolder}!`)
      
    })
    
  });

}).catch(err => {
  throw new Error(`Failed to retrieve OpenDirectoryDownloader executable from GitHub: ${err}`)
})