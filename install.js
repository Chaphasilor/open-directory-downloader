const fs = require(`fs`)

const fetch = require(`node-fetch`)
const AdmZip = require(`adm-zip`)

const CONFIG = require(`./config`)
const platform = process.platform
const architecture = process.arch

console.info(`Fetching release assets from GitHub...`)
fetch(`${CONFIG.GitHubReleasesUrl}/${CONFIG.OpenDirectoryDownloaderVersion.releaseId}/assets`).then(res => res.json()).then(assets => {

  const version = CONFIG.OpenDirectoryDownloaderVersion.version.match(/^v?(\d+\.\d+\.\d+\.\d+)$/)[1]
  let releaseName
  
  if (architecture === `arm` && platform === `linux`) {

    releaseName = `OpenDirectoryDownloader-${version}-linux-arm-self-contained.zip`

  } else if (architecture === `arm64` && platform === `linux`) {

    releaseName = `OpenDirectoryDownloader-${version}-linux-arm64-self-contained.zip`

  } else if (architecture === `x64` && platform === `linux`) {

    releaseName = `OpenDirectoryDownloader-${version}-linux-x64-self-contained.zip`

  } else if (architecture === `x64` && platform === `darwin`) {

    releaseName = `OpenDirectoryDownloader-${version}-osx-x64-self-contained.zip`

  } else if (architecture === `x64` && platform === `win32`) {

    releaseName = `OpenDirectoryDownloader-${version}-win-x64-self-contained.zip`

  } else {
    throw new Error(`Platform '${platform}' on architecture '${architecture}' is not supported by OpenDirectoryDownloader :(\nYou could try requesting support for it at https://github.com/KoalaBear84/OpenDirectoryDownloader ...`)
  }

  let asset = assets.find(asset => asset.name === releaseName)

  if (!asset) {
    throw new Error(`Executable not found on GitHub: ${releaseName} for version '${CONFIG.OpenDirectoryDownloaderVersion.version}'`)
  }
  
  let downloadUrl = asset.browser_download_url

  // console.log(`Creating ODD directory...`)

  if (fs.existsSync(CONFIG.OpenDirectoryDownloaderFolder) && fs.lstatSync(CONFIG.OpenDirectoryDownloaderFolder).isDirectory()) {

    console.info(`Removing old version of OpenDirectoryDownloader`)
  
    const allDirents = fs.readdirSync(CONFIG.OpenDirectoryDownloaderFolder, {
      withFileTypes: true,
    })
    const direntsToRemove = allDirents.filter(dirent => {
      if (dirent.isDirectory()) {
        return ![CONFIG.OpenDirectoryDownloaderOutputFolderName].includes(dirent.name)
      } else {
        return ![].includes(dirent.name)
      }
    })
  
    for (const dirent of direntsToRemove) {
  
      fs.rmSync(`${CONFIG.OpenDirectoryDownloaderFolder}/${dirent.name}`, {
        recursive: true,
      })
      
    }
    
  } else {
    fs.mkdirSync(CONFIG.OpenDirectoryDownloaderFolder)
  }

  if (!fs.existsSync(CONFIG.OpenDirectoryDownloaderOutputFolder)) {
    fs.mkdirSync(CONFIG.OpenDirectoryDownloaderOutputFolder)
  }
  
  console.info(`Starting download of OpenDirectoryDownloader executable...`)
  fetch(downloadUrl)
  .then(res => {

    if (!res.ok) {
      throw new Error(`Failed to download executable from GitHub!`)
    }

    const dest = fs.createWriteStream(`${CONFIG.OpenDirectoryDownloaderFolder}/ODD.zip`)
    res.body.pipe(dest)

    dest.on(`finish`, () => {

      let zip = new AdmZip(`${CONFIG.OpenDirectoryDownloaderFolder}/ODD.zip`)
      zip.extractAllTo(CONFIG.OpenDirectoryDownloaderFolder, true)

      // console.log(`Deleting zip after extraction...`)
      fs.unlinkSync(`${CONFIG.OpenDirectoryDownloaderFolder}/ODD.zip`)

      if (platform === `linux`) {
        // make executable
        console.log(`Making binary executable...`)
        fs.chmodSync(`${CONFIG.OpenDirectoryDownloaderFolder}/OpenDirectoryDownloader`, 0o755)
      }
      
      console.info(`OpenDirectoryDownloader has been installed successfully to ${CONFIG.OpenDirectoryDownloaderFolder}!`)
      
    })
    
  });

}).catch(err => {
  throw new Error(`Failed to retrieve OpenDirectoryDownloader executable from GitHub: ${err}`)
})
