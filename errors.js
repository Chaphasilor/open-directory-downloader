class ODDError extends Error {
  constructor(message, ...extras) {

    super()

    Error.captureStackTrace(this, this.constructor)
    this.name = 'ODDError'
    this.message = message
    if (extras) {
      this.extras = extras
    }

  }
}

class ODDOutOfMemoryError extends Error {
  constructor(message, ...extras) {

    super()

    Error.captureStackTrace(this, this.constructor)
    this.name = 'ODDOutOfMemoryError'
    this.message = message
    if (extras) {
      this.extras = extras
    }

  }
}

class ODDWrapperError extends Error {
  constructor(message, ...extras) {

    super()

    Error.captureStackTrace(this, this.constructor)
    this.name = 'WrapperError'
    this.message = message
    if (extras) {
      this.extras = extras
    }

  }
}

module.exports = {
  ODDError,
  ODDOutOfMemoryError,
  ODDWrapperError,
}