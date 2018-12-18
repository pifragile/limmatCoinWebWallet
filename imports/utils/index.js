import { Promise } from 'meteor/promise'

export function promisify(inner) {
  return new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  )
}

export function toAsync(fn) {
  return (...args) => {
    return new Promise((resolve, reject) =>
      fn.bind(this)(...args, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    )
  }
}

export function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return (
    s4() +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    s4() +
    s4()
  )
}

// takes as input an array of objects and returns an array with all the values
// corresponding to the specified key in these objects
export function filterValuesByKey(array, key) {
  return array.reduce((values, entry) => {
    values.push(entry[key])
    return values
  }, [])
}
