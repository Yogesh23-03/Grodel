let io = null

const setIo = (ioInstance) => {
  io = ioInstance
}

const getIo = () => io

module.exports = { setIo, getIo }
